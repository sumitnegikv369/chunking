import express from "express"
import { createHandler } from "graphql-http/lib/use/express"
import { buildSchema } from "graphql"
import cors from "cors"
import fs from "fs"

const schema = buildSchema(`
type Query {
  hello(name: String!): String
}

type Mutation {
    processCSV(data: [[String]]!, completed: Boolean!): ProcessCSVResponse!
  }

  type ProcessCSVResponse {
    success: Boolean!
    message: String
  }
`)
const receivedChunks = [];
const root = {
    hello(args) {
      console.log(receivedChunks);
        return "Hello " + args.name;
      },
      processCSV({data, completed}) {
        receivedChunks.push(...data);
        if (completed) {
          const jsonData = JSON.stringify(receivedChunks);
          const filePath = 'merged_data.json';
          
          try {
            fs.writeFileSync(filePath, jsonData);
            console.log(`File ${filePath} written successfully.`);
          } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
          }
        }
          return {
            success: true,
            message: "CSV data processed successfully!",
          };
      },
  };

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cors());

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

app.listen(4001, ()=>{
    console.log("Running a GraphQL API server at http://localhost:4001/graphql")
})