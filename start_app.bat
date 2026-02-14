@echo off
echo Starting Vighnaharta CMS...

echo Starting Backend...
start cmd /k "cd server && npm run dev"

echo Starting Frontend...
start cmd /k "cd client && npm run dev"

echo Done! App should open on http://localhost:5173
