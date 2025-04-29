import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import path from 'path';

const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'files',
  async (job) => {
    console.log('🚀 Processing job:', job.data);

    try {
      const { filePath } = job.data;

      if (!filePath) {
        throw new Error('filePath missing in job data');
      }

      // 1. Load the PDF
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      console.log(`✅ Loaded ${docs.length} documents from PDF`);

      if (!docs.length) {
        console.warn('⚠️ No documents found in PDF.');
        return;
      }

      // 2. Split text
      const splitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
      });
      const splitDocs = await splitter.splitDocuments(docs);
      console.log(`✅ Split into ${splitDocs.length} chunks`);

      if (!splitDocs.length) {
        console.warn('⚠️ No split documents created!');
        return;
      }

      // 3. Embeddings
      const embeddings = new HuggingFaceTransformersEmbeddings({
        modelName: 'Xenova/all-MiniLM-L6-v2', // Local and free
      });

      // 4. Connect to Qdrant
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: 'http://localhost:6333',
          collectionName: 'Embedding_Testing',
        }
      );

      // 5. Store
      await vectorStore.addDocuments(splitDocs);
      console.log(`🎯 Successfully added documents to vector store.`);

    } catch (error) {
      console.error('❌ Worker error:', error);
    }
  },
  {
    concurrency: 5, // 5 is safe for HuggingFace models
    connection,
  }
);

console.log('🚀 Worker started and listening for jobs...');