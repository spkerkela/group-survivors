#!/usr/bin/env bash

# Create a new tmux session
tmux new-session -s survivors -d

tmux send-keys 'npm run server' 'C-m'
# Split the window vertically
tmux split-window -v

# Run the first command in the first window

# Run the second command in the second window
tmux send-keys 'npm run web-client' 'C-m'

# Attach to the tmux session
tmux -2 attach-session 