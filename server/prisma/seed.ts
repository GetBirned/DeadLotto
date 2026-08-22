// The challenge list lives in shared/challenges.ts and is read directly by the
// server at runtime (see src/routes/challenges.ts) - there's no DB table to seed.
// This file exists so `npm run prisma:seed` has something to run without erroring.
console.log('Nothing to seed - challenges are served from shared/challenges.ts at runtime.')
