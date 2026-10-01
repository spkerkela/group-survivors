------------------------------- MODULE Spell -------------------------------
EXTENDS Integers

CONSTANTS Cooldown, MultiCooldown, MaxDelta
ASSUME /\ Cooldown > 0 /\ MultiCooldown >= 0 /\ MaxDelta > 0

VARIABLES state, aura, extra, castCount, done, timer, emitted
vars == <<state, aura, extra, castCount, done, timer, emitted>>
Count(a, n) == IF a THEN 1 ELSE IF n >= 2 THEN 3 ELSE 1 + n
Clamp(n) == IF n < 0 THEN 0 ELSE n

\* One living player's spell. Units are abstract ticks, not seconds.
\* A cast attempt need not hit anything; "emitted" counts castSpell calls.
Init == /\ state = "Cast" /\ aura \in BOOLEAN /\ extra \in 0..3
        /\ castCount = Count(aura, extra) /\ done = 0 /\ timer = 0
        /\ emitted = FALSE

Tick(dt) ==
    /\ IF state = "Cast"
       THEN IF done < castCount
            THEN /\ emitted' = (timer - dt <= 0)
                 /\ done' = IF emitted' THEN done + 1 ELSE done
                 /\ timer' = IF emitted' THEN MultiCooldown ELSE Clamp(timer - dt)
                 /\ UNCHANGED <<state, castCount>>
            ELSE /\ state' = "Cooldown" /\ emitted' = FALSE
                 \* Abstract the supported 0..50% reduction into a positive duration.
                 /\ timer' \in 1..Cooldown
                 /\ UNCHANGED <<done, castCount>>
       ELSE /\ emitted' = FALSE
            /\ IF timer - dt <= 0
               THEN /\ state' = "Cast" /\ castCount' = Count(aura, extra)
                    /\ done' = 0 /\ timer' = 0
               ELSE /\ timer' = timer - dt /\ UNCHANGED <<state, castCount, done>>
    /\ UNCHANGED <<aura, extra>>

\* Allow additional-cast upgrades between updates; castCount is latched on entry.
Upgrade == /\ extra < 3 /\ extra' = extra + 1
           /\ emitted' = FALSE
           /\ UNCHANGED <<state, aura, castCount, done, timer>>
PositiveTick == \E dt \in 1..MaxDelta : Tick(dt)
Next == (\E dt \in 0..MaxDelta : Tick(dt)) \/ Upgrade
Spec == Init /\ [][Next]_vars /\ WF_vars(PositiveTick)

TypeOK == /\ state \in {"Cast", "Cooldown"} /\ aura \in BOOLEAN /\ extra \in 0..3
          /\ castCount \in 1..3 /\ done \in 0..castCount
          /\ timer \in 0..(Cooldown + MultiCooldown) /\ emitted \in BOOLEAN
AuraSingleCast == aura => castCount = 1
FullBurstBeforeCooldown == state = "Cooldown" => done = castCount
\* Stuttering repeats an observation, not a new cast.
CastSafety == [][emitted' =>
    (state = "Cast" /\ done < castCount /\ done' = done + 1 /\ state' = "Cast")]_vars
Cycles == /\ []<>(state = "Cooldown") /\ []<>(state = "Cast" /\ done = 0)
=============================================================================
