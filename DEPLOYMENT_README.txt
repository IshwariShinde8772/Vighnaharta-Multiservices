DEPLOYMENT INSTRUCTIONS
=======================

To run this application on a client's machine:

1. PREREQUISITES:
   - Install **Node.js** (LTS Version) on the client machine.
   - Install **PostgreSQL** and create a database named 'vighnaharta_db' (password: Pass@123).
   - If you have existing data, backup your local DB and restore it on the client's machine.

2. FOLDER SETUP:
   - Copy the entire 'Dashboard' folder to the client's machine (e.g., Desktop).
   - You strictly only need:
     - server/ (folder)
     - client/dist/ (folder - contains the built website)
     - Start_App_Production.bat
   - The 'client/src' and 'client/node_modules' are valid ONLY for development, not needed for running.

3. FIRST TIME RUN:
   - Open the 'server' folder in terminal and run: `npm install` (Only if you didn't copy node_modules).
   - If you copied the full folder with node_modules, you can skip this.

4. STARTING THE APP:
   - Double-click `Start_App_Production.bat`.
   - The app will open at http://localhost:5000 (Account logic & Dashboard).

MAINTENANCE:
   - To update the code, just replace the 'Dashboard' folder (or specific files).
   - Database is stored in PostgreSQL, so code updates won't delete data.
