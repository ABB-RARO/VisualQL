import { importSchema } from 'graphql-import'
import { GraphQLSchema} from 'graphql'
import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from 'graphql-tools'
import * as express  from 'express';
import { Router } from 'express';
import * as cors from "cors";
import * as fs from 'fs';
import * as path from 'path';
import * as urlencode from 'urlencode';
import { renderFile } from 'eta';
import { ITypeDefinitions } from 'apollo-server';
import * as multer from 'multer'

const SPEC_DIR = process.env.DIRECTORY || path.join(__dirname, 'specs/')
const G_PIN = process.env.PIN || '327+723-'
const G_PORT = process.env.PORT || 4004

function readSchema(fileName:String) : GraphQLSchema {
    const resolvers = {}
    const typeDefs = importSchema(`${SPEC_DIR}${fileName}`) 
    const schema = makeExecutableSchema({typeDefs, resolvers, resolverValidationOptions: {
        requireResolversForResolveType: false
      }})
    return schema
}

function makeSchema(typeDefs:ITypeDefinitions) : GraphQLSchema {
    const resolvers = {}
    const schema = makeExecutableSchema({typeDefs, resolvers, resolverValidationOptions: {
        requireResolversForResolveType: false
      }})
    return schema
}

const app = express()
app.use("*", cors());
app.use(express.json());

const mocks = {
    Url: () => 'https://this.is.mock.url.com/',
    Date: () => '2020-12-15T08:01:02+01'
  };

function uploadFilename(originalname:string){
    return path.parse(originalname).name + '.graphql'    
}

function createServer(expressApp:any, file:string){
    const fileName = path.parse(file).name
    const schema = readSchema(file)
    const server = new ApolloServer({
        schema,
        mocks: mocks,
    });
    
    server.applyMiddleware({app: expressApp, path: `/gql/${ urlencode(fileName) }`})
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, SPEC_DIR);
    },

    // By default, multer removes file extensions so let's add graphql back
    filename: function(req, file, cb) {
        cb(null, uploadFilename(file.originalname));
    }
});

const router = Router()

const upload = multer ({ storage: storage })
app.post('/api/upload', upload.single('schema'), (req, res) => {
    if ( req.body.pin == G_PIN)
    {
        const fn = uploadFilename(req.file.originalname)
        createServer(app, fn)
        res.redirect("/")
    }
    else
    {
        setTimeout(() => { res.sendStatus(401) }, 3000);
    }
});

fs.readdir(SPEC_DIR, (err, files) => {
    files.forEach(file => {
      if ( file.indexOf('.graphql') > 0){
        try{
            const fileName = path.parse(file).name
            const schema = readSchema(file)
            const server = new ApolloServer({
                schema,
                mocks: mocks,
            });
            
            server.applyMiddleware({app, path: `/gql/${ urlencode(fileName) }`})

        }catch(err){
            console.log(err)
        }
    }})
});
  

router.get("/", (request,response) => {
    var content = ''
    fs.readdir(SPEC_DIR, (err, files) => {
        var filesToRender = []
        if (err != null )
            console.log(err);
        files.forEach(file => {
            if ( file.indexOf('.graphql') > 0){
                var fileWoExt = path.parse(file).name
                filesToRender.push(fileWoExt)
            }
        })
        console.log("Attempt to render, GQL folder:" + SPEC_DIR)
        renderFile( `${__dirname}/templates/mocklist.html`, 
            {files: filesToRender})
            .then( (content:String) => {
                response.send(content)
            } )
        
    })

})


app.use(router)

app.listen({ port: G_PORT }, () =>
  console.log(`🚀 Mock server ready at http://localhost:${G_PORT}`)
);