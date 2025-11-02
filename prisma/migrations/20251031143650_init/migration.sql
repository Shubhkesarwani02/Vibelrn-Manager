-- CreateTable
CREATE TABLE "Category" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHistory" (
    "id" BIGSERIAL NOT NULL,
    "text" VARCHAR(255),
    "stars" INTEGER NOT NULL,
    "review_id" VARCHAR(255) NOT NULL,
    "tone" VARCHAR(255),
    "sentiment" VARCHAR(255),
    "category_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" BIGSERIAL NOT NULL,
    "text" VARCHAR(255) NOT NULL,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "ReviewHistory_review_id_idx" ON "ReviewHistory"("review_id");

-- CreateIndex
CREATE INDEX "ReviewHistory_category_id_idx" ON "ReviewHistory"("category_id");

-- CreateIndex
CREATE INDEX "ReviewHistory_created_at_idx" ON "ReviewHistory"("created_at");

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
