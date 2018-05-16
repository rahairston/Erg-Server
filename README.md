# How to install on a Unix/Linux System:
- recommended using Debian OR Arch systems (can be on virtualbox)
- The `bcrypt` package for NodeJS does not work on Windows natively, therefore we will not run this on Windows

## Dependencies
- node
- npm
- mongodb
- git
- curl

### Debian
1. Execute the `chmod +x Debian.sh` command
2. Execute the `Debian.sh` file as SU. This will download all necessary dependencies.

### Arch
1. Execute the `Arch.sh` file as SU or sudo. This will download all necessary dependencies

### All
1. After running installation scripts, go into the `Server` directory and, run `npm i` to install all node dependencies
2. Run `mongod` in a separate terminal
  NOTE: If running mongod produces an error about file size, run `mongod --smallfiles`
3. Run `npm run start`

