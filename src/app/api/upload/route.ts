import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Queue } from 'bullmq';

export const dynamic = 'force-dynamic';

// BullMQ queue (connected to Redis/Valkey)
const myQueue = new Queue('files', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Local folder to save uploaded files
const uploadFolder = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadFolder, fileName);

    // ✅ Ensure /public/uploads exists
    await mkdir(uploadFolder, { recursive: true });

    // ✅ Save file to local disk
    await writeFile(filePath, buffer);

    const publicFilePath = `/uploads/${fileName}`;

    // ✅ Add job to BullMQ queue
    await myQueue.add('file-upload', {
      fileName,
      fileUrl: publicFilePath, // for frontend or logging
      fileType: file.type,
      fileSize: file.size,
      filePath, // actual path for worker to load
      fileCreatedAt: new Date().toISOString(),
      fileUpdatedAt: new Date().toISOString(),
    });

    return Response.json({
      message: '✅ File uploaded and job queued',
      fileUrl: publicFilePath,
      queue: myQueue.name,
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return new Response('Upload failed', { status: 500 });
  }
}