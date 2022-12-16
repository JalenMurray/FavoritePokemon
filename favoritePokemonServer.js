'use strict'

// Interpreter Variables
let fs = require('fs')
const { exit } = require('process')
const prompt = 'Type stop to shutdown the server: '
const exitMsg = 'Shutting down the server'

// Web Server Variables
const http = require('http')
const path = require('path')
const bodyParser = require('body-parser')
const express = require('express')
const { table } = require('console')
const { start } = require('repl')
const app = express()
const httpSuccessStatus = 200
let portNumber = 5001
app.use(bodyParser.urlencoded({ extended: false }))

// MongoDB Variables
require('dotenv').config({
   path: path.resolve(__dirname, 'credentialsDontPost/.env'),
})
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const db = process.env.MONGO_DB_NAME
const collection = process.env.MONGO_COLLECTION
const { MongoClient, ServerApiVersion } = require('mongodb')

const uri = `mongodb+srv://${username}:${password}@cluster0.v5jskgj.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   serverApi: ServerApiVersion.v1,
})

function startServer() {
   // Start Web Server
   app.set('views', path.resolve(__dirname, 'templates'))
   app.set('view engine', 'ejs')
   app.get('/', (request, response) => {
      const variables = {}
      response.render('index', variables)
   })
   app.listen(portNumber)
   console.log(`Web server is running at http://localhost:${portNumber}`)

   // Start Interpreter
   process.stdin.setEncoding('utf8')
   process.stdout.write(prompt)
   process.stdin.on('readable', () => {
      let dataInput = process.stdin.read()
      if (dataInput !== null) {
         let command = dataInput.trim()
         if (command === 'stop') {
            process.stdout.write(exitMsg)
            process.exit(0)
         } else {
            console.log(`Invalid command: ${command}`)
         }
         process.stdout.write(prompt)
         process.stdin.resume()
      }
   })
}

startServer()

// New Entry
app.get('/select', async (request, response) => {
   let pokemonList = await getPokemonList()
   let pokemonListStr = ''
   pokemonList.forEach(
      (pokemon) =>
         (pokemonListStr += `<option value=${pokemon.name}>${cap(
            pokemon.name
         )}</option>`)
   )
   const variables = { pokemonList: pokemonListStr }
   response.render('select', variables)
})
app.post('/select', async (request, response) => {
   let { name, favorite } = request.body
   const entry = {
      name: name,
      favorite: favorite,
   }
   addFavorite(entry).catch(console.error)
   console.log(favorite)
   const fetchResponse = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${favorite}`
   )
   const pokemon = await fetchResponse.json()
   let variables = {
      header: `Thanks ${cap(
         name
      )} for Selecting your Favorite Pokemon from Gen 1!  Here is some info on ${cap(
         favorite
      )}`,
      id: pokemon.id,
      name: cap(pokemon.name),
      types: pokemon.types.map((type) => cap(type.type.name)),
      url: `https://pokeapi.co/api/v2/pokemon/${favorite}`,
   }
   response.render('info', variables)
})

// Review Application
app.get('/find', (request, response) => {
   response.render('find', {})
})
app.post('/find', async (request, response) => {
   let { name } = request.body
   let favorite = await getFavorite(name)
   const fetchResponse = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${favorite.favorite}`
   )
   const pokemon = await fetchResponse.json()
   let variables = {
      header: `${cap(favorite.name)}'s Favorite Gen 1 Pokemon is ${cap(
         favorite.favorite
      )}! Here is some info on ${cap(favorite.favorite)}`,
      id: pokemon.id,
      name: cap(pokemon.name),
      types: pokemon.types.map((type) => cap(type.type.name)),
      url: `https://pokeapi.co/api/v2/pokemon/${favorite.favorite}`,
   }
   response.render('info', variables)
})

// MongoDB Helper Funcs
async function addFavorite(favorite) {
   try {
      await client.connect()
      const result = await client
         .db(db)
         .collection(collection)
         .insertOne(favorite)
   } catch (e) {
      console.error(e)
   } finally {
      await client.close()
   }
}

async function getFavorite(name) {
   let filter = { name: name }
   try {
      await client.connect()
      const result = await client.db(db).collection(collection).findOne(filter)
      if (result) {
         return result
      } else {
         return null
      }
   } catch (e) {
      console.error(e)
   } finally {
      await client.close()
   }
}

async function getManyApplications(client, database, collection, minGPA) {
   let filter = { gpa: { $gte: minGPA } }
   try {
      await client.connect()
      const cursor = await client
         .db(database)
         .collection(collection)
         .find(filter)
      let applications = await cursor.toArray()
      return applications
   } catch (e) {
      console.error(e)
   } finally {
      await client.close()
   }
}

async function removeAllApplications(client, database, collection) {
   try {
      await client.connect()
      const result = await client
         .db(database)
         .collection(collection)
         .deleteMany({})
      return result.deletedCount
   } catch (e) {
      console.error(e)
   } finally {
      await client.close()
   }
}

// Misc Helper Funcs
function getTable(applications) {
   const tableStyle = 'style="border:1px solid black"'
   let tableStr = `<table ${tableStyle}><tr><th ${tableStyle}>Name</th><th ${tableStyle}>GPA</th></tr>`
   applications.forEach((application) => {
      tableStr += `<tr><td ${tableStyle}>${application.name}</td><td ${tableStyle}>${application.gpa}</td></tr>`
   })
   tableStr += `</table>`
   return tableStr
}

async function getPokemonList() {
   let allPokemon = []
   for (let id = 1; id <= 151; id++) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      const pokemon = await response.json()
      let entry = {
         name: pokemon.name,
      }
      allPokemon.push(entry)
   }
   return allPokemon
}

function cap(name) {
   return name.charAt(0).toUpperCase() + name.slice(1)
}
