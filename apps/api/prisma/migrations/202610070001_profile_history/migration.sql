CREATE TABLE "UserProfileChange" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,
    CONSTRAINT "UserProfileChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserProfileChange_userId_occurredAt_id_idx" ON "UserProfileChange"("userId", "occurredAt", "id");
ALTER TABLE "UserProfileChange" ADD CONSTRAINT "UserProfileChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
