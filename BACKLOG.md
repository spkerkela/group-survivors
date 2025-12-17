# Backlog for Group Survivors

- [x] Refactor leveling
  - [x] levels should not be gained immediately
  - [x] they are stored until upgrade mode
  - [x] each level gives you a stat choice
- [x] Persist player state between matches
  - [x] store player stats and choices separately from game-state runtime model
  - [x] when a new match starts, apply the stored upgrades etc to the created player
- [x] Implement upgrade mode
  - [x] player is given a choice of active and passive spells
  - [x] player chooses
  - [x] server receives choice, remembers that player has done the choice, adds the choice to the server game-state
  - [x] once all players have done their choice the next wave starts
  - [x] if someone is too slow to make a choice (timeout tbd, perhaps 30 seconds?) a random choice is forced by the server and the match starts anyway
- Enforce spell/passive limits
  - Players can have a limited amount of active and passive spells (e.g., 5 active, 5 passive).
  - When generating upgrade choices:
    - If limit reached, only offer upgrades for existing spells/passives.
    - If limit not reached, can offer new spells/passives.

