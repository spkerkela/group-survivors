--------------------------- MODULE GameSession ---------------------------
EXTENDS Integers, FiniteSets

CONSTANTS Players, PlayersRequired, Waves, WaveTicks, UpgradeTicks, EndTicks,
          MaxPending
ASSUME /\ Players # {} /\ PlayersRequired \in 1..Cardinality(Players)
       /\ Waves > 0 /\ WaveTicks > 0 /\ UpgradeTicks > 0 /\ EndTicks > 0
       /\ MaxPending \in Nat

VARIABLES phase, wave, clock, connected, joined, active, participants,
          ready, pending, awarded, budget
vars == <<phase, wave, clock, connected, joined, active, participants,
          ready, pending, awarded, budget>>
Eligible == participants \cap connected
Zero == [p \in Players |-> 0]

\* Control-flow abstraction of server/game-session/*.ts. See README for scope.
\* ponytail: fixed cohort outside Upgrade; extend joins/reconnects for lifecycle safety.
Init == /\ phase = "PreMatch" /\ wave = 0 /\ clock = 0
        /\ connected = Players /\ joined = {} /\ active = {}
        /\ participants = {} /\ ready = {}
        /\ pending = Zero /\ awarded = Zero /\ budget = Zero

Join(p) == /\ phase = "PreMatch" /\ p \in connected \ joined
           /\ joined' = joined \cup {p}
           /\ UNCHANGED <<phase, wave, clock, connected, active, participants,
                          ready, pending, awarded, budget>>

\* Disconnects are explored during upgrade, where the listener cohort is fixed.
Disconnect(p) == /\ phase = "Upgrade" /\ p \in connected
                 /\ connected' = connected \ {p}
                 /\ joined' = joined \ {p}
                 /\ UNCHANGED <<phase, wave, clock, active, participants,
                                ready, pending, awarded, budget>>

\* One valid selection, or the explicit empty confirmation at zero levels.
Choose(p) == /\ phase = "Upgrade" /\ p \in Eligible \ ready
             /\ pending' = [pending EXCEPT ![p] = IF @ > 0 THEN @ - 1 ELSE 0]
             /\ awarded' = [awarded EXCEPT ![p] = IF pending[p] > 0 THEN @ + 1 ELSE @]
             /\ ready' = IF pending'[p] = 0 THEN ready \cup {p} ELSE ready
             /\ UNCHANGED <<phase, wave, clock, connected, joined, active,
                            participants, budget>>

PreTick == /\ phase = "PreMatch"
           /\ Cardinality(joined \cap connected) >= PlayersRequired
           /\ phase' = "Match" /\ wave' = 0 /\ clock' = 0
           /\ active' = joined \cap connected
           /\ UNCHANGED <<connected, joined, participants, ready, pending, awarded, budget>>

\* MatchState checks timer > waveLength BEFORE processing deaths.
\* Combat is abstracted to an arbitrary surviving subset on each update.
MatchTick ==
    /\ phase = "Match"
    /\ IF clock + 1 > WaveTicks
       THEN /\ phase' = "Upgrade"
            /\ participants' = active \cap connected /\ ready' = {}
            /\ clock' = IF Cardinality(active \cap connected) > 1 THEN UpgradeTicks ELSE -1
            /\ pending' \in [Players -> 0..MaxPending]
            /\ budget' = pending' /\ awarded' = Zero
            /\ UNCHANGED active
       ELSE /\ active' \in SUBSET active
            /\ phase' = IF active' = {} THEN "EndMatch" ELSE "Match"
            /\ clock' = IF active' = {} THEN EndTicks ELSE clock + 1
            /\ UNCHANGED <<participants, ready, pending, awarded, budget>>
    /\ UNCHANGED <<wave, connected, joined>>

\* UpgradeState.update: cancel timer when solo, otherwise tick; auto-select;
\* then test every connected participant. Entry/exit run in the same JS turn.
UpgradeTick ==
    /\ phase = "Upgrade"
    /\ LET t == IF Cardinality(Eligible) <= 1 THEN -1 ELSE clock - 1
           timedOut == t # -1 /\ t <= 0
           r == IF timedOut THEN ready \cup Eligible ELSE ready
       IN /\ ready' = r
          /\ pending' = [p \in Players |-> IF timedOut /\ p \in Eligible THEN 0 ELSE pending[p]]
          /\ awarded' = [p \in Players |-> IF timedOut /\ p \in Eligible
                                                 THEN awarded[p] + pending[p] ELSE awarded[p]]
          /\ IF Eligible \subseteq r
             THEN /\ phase' = IF wave + 1 >= Waves THEN "EndMatch" ELSE "Match"
                  /\ wave' = IF wave + 1 >= Waves THEN wave ELSE wave + 1
                  /\ clock' = IF wave + 1 >= Waves THEN EndTicks ELSE 0
                  /\ active' = active
                  /\ joined' = joined \cup (active \cap connected)
             ELSE /\ phase' = phase /\ wave' = wave /\ clock' = t
                  /\ UNCHANGED <<active, joined>>
    /\ UNCHANGED <<connected, participants, budget>>

EndTick == /\ phase = "EndMatch"
           /\ phase' = IF clock <= 1 \/ connected = {} THEN "PreMatch" ELSE phase
           /\ clock' = IF clock <= 1 \/ connected = {} THEN 0 ELSE clock - 1
           /\ UNCHANGED <<wave, connected, joined, active, participants, ready, pending, awarded, budget>>

Tick == PreTick \/ MatchTick \/ UpgradeTick \/ EndTick
Next == Tick \/ (\E p \in Players : Join(p) \/ Disconnect(p) \/ Choose(p))
        \/ (phase = "PreMatch" /\ UNCHANGED vars) \* Waiting in the lobby is legal.
SoloChoose(p) == Cardinality(Eligible) <= 1 /\ Choose(p)
\* Time advances. Only solo confirmation needs cooperation; multiplayer times out.
Spec == Init /\ [][Next]_vars /\ WF_vars(Tick)
        /\ (\A p \in Players : WF_vars(SoloChoose(p)))

TypeOK == /\ phase \in {"PreMatch", "Match", "Upgrade", "EndMatch"}
          /\ wave \in 0..(Waves - 1)
          /\ clock \in -1..(WaveTicks + UpgradeTicks + EndTicks)
          /\ connected \subseteq Players /\ joined \subseteq connected
          /\ active \subseteq Players /\ participants \subseteq Players
          /\ ready \subseteq participants
          /\ pending \in [Players -> 0..MaxPending]
          /\ awarded \in [Players -> 0..MaxPending]
          /\ budget \in [Players -> 0..MaxPending]
ConservedLevels == \A p \in Players : pending[p] + awarded[p] = budget[p]
ReadyHasNoPending == phase = "Upgrade" => (\A p \in ready : pending[p] = 0)
TransitionSafety == [][
    /\ (phase = "PreMatch" /\ phase' # phase =>
           phase' = "Match" /\ wave' = 0 /\ Cardinality(joined \cap connected) >= PlayersRequired)
    /\ (phase = "Match" => phase' \in {"Match", "Upgrade", "EndMatch"})
    /\ (phase = "Upgrade" /\ phase' # phase =>
           Eligible \subseteq ready' /\
           IF wave + 1 >= Waves THEN phase' = "EndMatch"
           ELSE phase' = "Match" /\ wave' = wave + 1)
    /\ (phase = "EndMatch" => phase' \in {"EndMatch", "PreMatch"})]_vars
MatchProgress == (phase = "Match") ~> (phase # "Match")
UpgradeProgress == (phase = "Upgrade") ~> (phase # "Upgrade")
EndProgress == (phase = "EndMatch") ~> (phase = "PreMatch")
=============================================================================
