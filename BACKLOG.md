# Backlog for Group Survivors

- Refactor leveling
  - levels should not be gained immediately
  - they are stored until upgrade mode
  - each level gives you a stat choice
- Persist player state between matches
  - store player stats and choices separately from game-state runtime model
  - when a new match starts, apply the stored upgrades etc to the created player
- Implement upgrade mode
  - player is given a choice of active and passive spells
  - player chooses
  - server receives choice, remembers that player has done the choice, adds the choice to the server game-state
  - once all players have done their choice the next wave starts
  - if someone is too slow to make a choice (timeout tbd, perhaps 30 seconds?) a random choice is forced by the server and the match starts anyway
  - players can have a limited amount of active and passive spells, but they can be upgraded. Let's start with 5 active and passive and 10 levels per
