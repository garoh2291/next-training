import sql from "better-sqlite3";
import slugify from "slugify";
import xss from "xss";
import { S3 } from "@aws-sdk/client-s3";

const s3 = new S3({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.PROJECT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.PROJECT_AWS_SECRET_ACCESS_KEY,
  },
});

const db = sql("meals.db");

export async function getAllMeals() {
  // await new Promise((resolve) => setTimeout(resolve, 5000));

  // throw new Error("Failed to fetch meals");
  return db.prepare("SELECT * FROM meals").all();
}

export async function getMeal(slug) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));

  return db.prepare("SELECT * FROM meals WHERE slug = ?").get(slug);
}

export async function saveMeal(meal) {
  meal.slug = slugify(meal.title, { lower: true });
  //sanitize html
  meal.instructions = xss(meal.instructions);

  const extension = meal.image.name.split(".").pop();
  const fileName = `${meal.slug}.${extension}`;

  const bufferedImage = await meal.image.arrayBuffer();

  s3.putObject({
    Bucket: "garnik-nextjs-demo-users-image",
    Key: fileName,
    Body: Buffer.from(bufferedImage),
    ContentType: meal.image.type,
  });

  meal.image = fileName;

  db.prepare(
    `
    INSERT INTO meals
      (title, slug, summary, instructions, image, creator, creator_email)
    VALUES (
      @title,
      @slug,
      @summary,
      @instructions,
      @image,
      @creator,
      @creator_email
    )
  `
  ).run(meal);
}
