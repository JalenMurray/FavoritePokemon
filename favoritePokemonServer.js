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
   app.listen(portNumber, () =>
      console.log(`Web server is running at http://localhost:${portNumber}`)
   )
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
   const info = await getInfo(favorite)
   let variables = {
      header: `Thanks ${cap(
         name
      )} for Selecting your Favorite Pokemon from Gen 1!  Here is some info on ${cap(
         favorite
      )}`,
      id: info.id,
      name: info.name,
      types: info.types,
      url: info.url,
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
   let variables
   if (favorite) {
      const info = await getInfo(favorite.favorite)
      variables = {
         header: `${cap(favorite.name)}'s Favorite Gen 1 Pokemon is ${cap(
            favorite.favorite
         )}! Here is some info on ${cap(favorite.favorite)}`,
         id: info.id,
         name: info.name,
         types: info.types,
         url: info.url,
      }
   } else {
      variables = {
         header: `${cap(name)} Does not Have an Entry in the Database`,
         id: 'NONE',
         name: 'NONE',
         types: 'NONE',
         url: `NONE`,
      }
   }

   response.render('info', variables)
})

app.get('/findNames', (request, response) => {
   response.render('findNames', {})
})
app.post('/findNames', async (request, response) => {
   let { pokemonName } = request.body
   let people = await getNames(pokemonName)
   let peopleStr = ''
   people.forEach((entry) => (peopleStr += `<li>${entry.name}</li>`))
   const variables = {
      pokemonName: cap(pokemonName),
      people: peopleStr,
   }
   response.render('people', variables)
})

app.get('/remove', (request, response) => {
   response.render('remove', {})
})
app.post('/remove', async (request, response) => {
   let { name } = request.body
   let variables
   if (!name) {
      variables = {
         msg: 'No Entries were removed\n\nPlease provide a valid name',
      }
   } else {
      removeEntry(name)
      variables = {
         msg: `Entry for ${name} has been removed`,
      }
   }

   response.render('removeConfirm', variables)
})

app.get('/removeAll', (request, response) => {
   response.render('removeAll', {})
})
app.post('/removeAll', async (request, response) => {
   removeEntry()
   const variables = {
      msg: `All Entries have been removed`,
   }
   response.render('removeConfirm', variables)
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

async function getNames(pokemonName) {
   let filter = { favorite: pokemonName.toLowerCase() }
   try {
      await client.connect()
      const cursor = await client.db(db).collection(collection).find(filter)
      let applications = await cursor.toArray()
      return applications
   } catch (e) {
      console.error(e)
   } finally {
      await client.close()
   }
}

async function removeEntry(name) {
   try {
      let filter = name ? { name: name } : {}
      await client.connect()
      const result = await client
         .db(db)
         .collection(collection)
         .deleteMany(filter)
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

async function getInfo(name) {
   const fetchResponse = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${name}`
   )
   const pokemon = await fetchResponse.json()
   const info = {
      id: pokemon.id,
      name: cap(pokemon.name),
      types: pokemon.types.map(
         (type) =>
            `<span style="color: ${getTypeColor(type.type.name)}">${cap(
               type.type.name
            )}</span>`
      ),
      url: `https://pokeapi.co/api/v2/pokemon/${name}`,
   }
   return info
}

function getTypeColor(type) {
   if (type == 'bug') return 'rgb(138,150,11)'
   if (type == 'dark') return 'rgb(62,45,34)'
   if (type == 'dragon') return 'rgb(111,88,212)'
   if (type == 'electric') return 'rgb(226,160,27)'
   if (type == 'fairy') return 'rgb(218,149,215)'
   if (type == 'fighting') return 'rgb(105,39,25)'
   if (type == 'fire') return 'rgb(207,38,3)'
   if (type == 'flying') return 'rgb(144,166,240)'
   if (type == 'ghost') return 'rgb(52,51,115)'
   if (type == 'grass') return 'rgb(102,187,42)'
   if (type == 'ground') return 'rgb(210,178,86)'
   if (type == 'ice') return 'rgb(115,211,247)'
   if (type == 'normal') return 'rgb(160,151,140)'
   if (type == 'poison') return 'rgb(106,53,106)'
   if (type == 'psychic') return 'rgb(225,49,107)'
   if (type == 'rock') return 'rgb(160,137,58)'
   if (type == 'steel') return 'rgb(142,143,156)'
   if (type == 'water') return 'rgb(7,104,197)'
   return 'rgb(0, 0, 0)'
}
