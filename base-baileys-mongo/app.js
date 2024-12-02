const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MongoAdapter = require('@bot-whatsapp/database/mongo')
require('dotenv').config

/**
 * Declaramos las conexiones de Mongo
 */

const MONGO_DB_URI = 'mongodb+srv://pmms20012019:encarbot@cluster0.ev9kx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const MONGO_DB_NAME = 'db_bot'
const adapterDB = new MongoAdapter({
    dbUri: MONGO_DB_URI,
    dbName: MONGO_DB_NAME,
})
const opciones=[
    {id:'1',name:'Haburguesa Dalas', precio:30000},
    {id:'2',name:'Haburguesa Chicago', precio:40000},
    {id:'3',name:'Haburguesa Minessota', precio:45000}
]
const hamburguesas=[]
const local= 'Landderburger' 
const ubicacion=addKeyword(EVENTS.LOCATION)
.addAction(async(ctx,{gotoFlow,state})=>{
    console.log(ctx);
    await state.update({message:ctx.message})
})
.addAnswer(["Escribe 1 para confirmar.","Escribe 0 para cancelar."],{capture:true},
    async(ctx,{state,endFlow,fallBack})=>{
        const delivery= state.get('delivery')
        const direccion= state.get('message')
        console.log(direccion);
    switch(ctx.body){
        case '1':
            console.log(ctx);
            adapterDB.saveOrder({name:ctx.pushName,
                phone:ctx.from,
                delivery:delivery,
                items:hamburguesas,
                location:direccion

            })
            return endFlow('Tu pedido fue procesado y estara listo en aproximadamente 20 min.')
        case '0':
            state.clear()
            hamburguesas.length=0
            return endFlow('Orden cancelada, vuelva a escribir algo para solicitar de nuevo')
        default:
            return fallBack('Selecciona una opcion valida.')
    }
    
})
const confirmacion= addKeyword(EVENTS.ACTION)
.addAction(async(_,{flowDynamic})=>{
    const hamburguesa=hamburguesas.map(i=> i.name).join('\n')
    const total= hamburguesas.reduce((value, order)=>{return order.precio+value},0)
    return await flowDynamic([`Tu orden es:\n${hamburguesa}\n Y el total es:${total}`,
        'Ahora envia tu Ubicacion desde WhatsApp.'
    ])  
})


const seleccion= addKeyword(EVENTS.ACTION)
.addAnswer(["Selecciona el numero de lo que quieres pedir."
    ," 1-Hamburguesa Dalas"
    ," 2-Chicago"
    ," 3- Minnesota"
    ," 0-Volver"]
    ,{capture:true},
    async (ctx,{fallBack,state,gotoFlow})=>{
        const seleccion= opciones.find(opciones=>opciones.id===ctx.body)
        console.log(seleccion);
        await state.update(seleccion)
       if(seleccion){  
       }else if(ctx.body=== '0'){
        return gotoFlow(flowPrincipal)
       }else{
        return fallBack('Escribe el numero de una opcion correcta.')
       }     
    }
).addAnswer('Escribe la cantidad que quieres.',{capture:true},
    async (ctx,{state, fallBack})=>{
        let number=0
        if(!+ctx.body|| ctx.body===0){
            return fallBack('Escribe la cantidad que quieras.')
        }else{
            while(number<ctx.body){
                number++
                const nombre=state.get('name')
                const precio=state.get('precio')
                hamburguesas.push({name:nombre,precio:precio})
            }
        }
    }
).addAnswer(['Escribe',
    '1- Si quieres pedir otra hamburguesa.',
    '2- Si quieres confirmar tu pedido.',
    '0- Si quieres cancelar.' 
],{capture:true}, async (ctx,{gotoFlow,fallBack, state,endFlow })=>{
        switch(ctx.body){
            case '1':
                return gotoFlow(seleccion)
            case '2':
                return gotoFlow(confirmacion)
            case'0':
                state.clear()
                hamburguesas.length=0
                return endFlow('Pedido cancelado, escriba de vuelta si quiere ordenar.')
            default:
                return fallBack('Selecciona una opcion valida.')
        }
    })

const flowPrincipal = addKeyword('ole')
    .addAnswer(`🙌 Hola bienvenido a ${local}🍔✈️.`)
    .addAnswer(
        [
            'Aquí puedes ordenar tu pedido.',
            'Elige el número de la opción que desees.',
            'Envia 1 si quieres hacer un pedido y retirarlo en el local.🏬',
            'Envia 2 si quieres hacer un pedido y recibirlo por delivery.🛵',
        ],
        {
            capture:true
        },
        async (ctx, {fallBack,gotoFlow,state})=>{
            switch(ctx.body){
                case '1':
                    await state.update({delivery:false})
                    return gotoFlow(seleccion)
                case '2':
                    await state.update({delivery:true})
                    return gotoFlow(seleccion)
                default:
                    
                    return fallBack('Escribe 1 o 2')
            }
        }
        
    )

const main = async () => {
   /* const adapterDB = new MongoAdapter({
        dbUri: MONGO_DB_URI,
        dbName: MONGO_DB_NAME,
    })*/
    const adapterFlow = createFlow([flowPrincipal,seleccion,confirmacion,ubicacion])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
