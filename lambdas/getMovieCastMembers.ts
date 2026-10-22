import { Handler } from "aws-lambda";
import {
  GetCommand,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { createDDbDocClient, response } from "../shared/util";
import { MovieCast, MovieCastResponse } from "../shared/types";

const ddbDocClient = createDDbDocClient();

export const handler: Handler = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const queryParams = event.queryStringParameters;
    const facts = queryParams?.facts;
    if (!queryParams) { 
      return response(400, { message: 'Missing query parameters' })
    }
    
    if (!queryParams.movieId) {
      return response(400,{ message: "Missing movie Id parameter" })
    }
    const movieId = parseInt(queryParams.movieId);
    if (isNaN(movieId)) {
      return response(400, { message: "Invalid movie Id parameter" })
    }
    const includeFacts = queryParams.facts === "true";
    
    let commandInput: QueryCommandInput = {
      TableName: process.env.CAST_TABLE_NAME,
    };

    const castOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    const body: MovieCastResponse = {
      cast: (castOutput.Items ?? []) as MovieCast[],
    };

    if (includeFacts) {
      const movieOutput = await ddbDocClient.send(
        new GetCommand({
          TableName: process.env.MOVIE_TABLE_NAME,
          Key: { id: movieId },
        })
      );
      if (!movieOutput.Item) {
        return response(404, { message: "Invalid movie Id" });
      }
      body.movie = {
        title: movieOutput.Item.title,
        genre_ids: movieOutput.Item.genre_ids,
        overview: movieOutput.Item.overview,
      };
    }
    return response(200, { data: body });
  }
  catch (error: any) {
    console.log(JSON.stringify(error));
    return response(500, { error: (error as Error).message });
  }
};