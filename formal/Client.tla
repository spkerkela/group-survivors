------------------------------ MODULE Client ------------------------------
EXTENDS Naturals, Sequences

CONSTANT Scenarios
VARIABLES scenario, position, state, flags
vars == <<scenario, position, state, flags>>

\* A normal join/start, then a finite ordered server-event suffix.
\* Mandatory frames establish the starting phase; extra frames may occur anywhere.
Script(s) == <<"joined", "frame", "beginMatch", "frame">> \o
             CASE s = "disconnect" -> <<"disconnect">>
               [] s = "gameOver" -> <<"endMatch", "gameOver">>
               [] s = "upgradeResume" -> <<"endMatch", "upgrade", "beginMatch">>
Target(s) == CASE s = "disconnect" -> "Disconnected"
              [] s = "gameOver" -> "Connected"
              [] s = "upgradeResume" -> "GameLoop"

\* Exactly the listeners registered in ClientStateMachine.ts, not the intended ones.
\* GameLoop defines endMatchCallback but does NOT subscribe it.
Listeners(s) == CASE s = "Disconnected" -> {"joined"}
                 [] s = "Connected" -> {"disconnect", "beginMatch", "update"}
                 [] s = "GameLoop" -> {"update", "upgrade"}
                 [] s = "Upgrade" -> {"beginMatch", "gameOver"}

FrameState ==
    CASE state = "Disconnected" -> IF "joined" \in flags THEN "Connected" ELSE state
      [] state = "Connected" ->
           IF "disconnect" \in flags THEN "Disconnected"
           ELSE IF "beginMatch" \in flags \/ "update" \in flags THEN "GameLoop" ELSE state
      [] state = "GameLoop" -> IF "upgrade" \in flags THEN "Upgrade" ELSE state
      [] state = "Upgrade" ->
           IF "beginMatch" \in flags THEN "GameLoop"
           ELSE IF "gameOver" \in flags THEN "Connected" ELSE state
FrameFlags == IF FrameState # state THEN {} ELSE flags

Init == /\ scenario \in Scenarios /\ position = 1
        /\ state = "Disconnected" /\ flags = {}

Deliver == /\ position <= Len(Script(scenario))
           /\ LET event == Script(scenario)[position]
              IN IF event = "frame"
                 THEN /\ state' = FrameState /\ flags' = FrameFlags
                 ELSE /\ state' = state
                      /\ flags' = IF event \in Listeners(state) THEN flags \cup {event} ELSE flags
           /\ position' = position + 1
           /\ UNCHANGED scenario

Frame == /\ state' = FrameState /\ flags' = FrameFlags
         /\ UNCHANGED <<scenario, position>>
Next == Deliver \/ Frame
Spec == Init /\ [][Next]_vars /\ WF_vars(Deliver) /\ WF_vars(Frame)

TypeOK == /\ scenario \in {"disconnect", "gameOver", "upgradeResume"}
          /\ position \in 1..(Len(Script(scenario)) + 1)
          /\ state \in {"Disconnected", "Connected", "GameLoop", "Upgrade"}
          /\ flags \subseteq Listeners(state)
\* After delivery stops, animation frames must eventually catch up and stay there.
Converges == (position > Len(Script(scenario))) ~> (state = Target(scenario))
=============================================================================
