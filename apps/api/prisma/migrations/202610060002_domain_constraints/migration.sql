CREATE UNIQUE INDEX "Participation_user_local_active_key"
ON "Participation" ("userId", "localDate") WHERE "active" = true;
ALTER TABLE "Match" ADD CONSTRAINT "Match_availablePlaces_nonnegative" CHECK ("availablePlaces" >= 0);
ALTER TABLE "Match" ADD CONSTRAINT "Match_price_nonnegative" CHECK ("pricePerPerson" >= 0);
