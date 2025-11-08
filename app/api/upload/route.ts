import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

// Configure R2 client (Cloudflare R2 is S3-compatible)
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Invalid file" },
        { status: 400 }
      );
    }

    // Generate unique key and extract file extension
    const key = nanoid(10);
    const fullName = file.name;
    const ext = fullName.split(".").pop();
    const path = `images/${key}.${ext}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to R2
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: path,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
      })
    );

    // Return URL
    const url = `${process.env.R2_PUBLIC_URL}/${path}`;

    return NextResponse.json({
      image: {
        url,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
