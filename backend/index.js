import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema, GraphQLScalarType } from "graphql";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());

const Uint8ArrayType = new GraphQLScalarType({
  name: 'Uint8Array',
  description: 'Represents an array of 8-bit unsigned integers',
  parseValue: (value) => {
    if (value instanceof Uint8Array) {
      return value;
    }
    throw new Error('Value must be a Uint8Array');
  },
  serialize: (value) => {
    return value;
  },
});

const schema = buildSchema(`
scalar Uint8Array
  type Query {
    hello(name: String!): String
  }

  type Mutation {
    processChunk(data: [Uint8Array!]!, completed: Boolean!, extension: String!): ProcessChunkResponse!
  }

  type ProcessChunkResponse {
    success: Boolean!
    message: String
  }
`);

const allChunks = [];

const root = {
  Uint8Array: Uint8ArrayType,
  hello(args) {
    console.log(allChunks);
    return "Hello " + args.name;
  },
  processChunk({ data, completed, extension }) {
    const chunks = data.map(chunk => new Uint8Array(chunk));
    allChunks.push(...chunks);
    
    if (completed) {
      const buffer = Buffer.concat(allChunks.map(chunk => Buffer.from(chunk.buffer)));
      const filePath = `merged_data.${extension}`;
      console.log(buffer);
      try {
        fs.writeFileSync(filePath, buffer);
        console.log(`File ${filePath} written successfully.`);
      } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
      }
    }

    return {
      success: true,
      message: "Chunk processed successfully!",
    };
  },
};

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

app.use((req, res, next) => {
  const contentLength = req.headers["content-length"];
  console.log("Request payload size:", bytesToSize(contentLength));
  next();
});

app.all(
  "/graphql",
  createHandler({
    schema: schema,
    rootValue: root,
  })
);

app.listen(4001, () => {
  console.log("Running a GraphQL API server at http://localhost:4001/graphql");
});
