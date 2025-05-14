#!/usr/bin/env bash

npm ci
npm run lint
npm run test
npm run test-backend
