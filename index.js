const {Service, DiscoveryBackend} = require('./pico')

/**
 * Backend: http://pico.backend.cleverapps.io/
 * DISCOVERY_PORT= 80
 * DISCOVERY_HOST= pico.backend.cleverapps.io
 * DISCOVERY_PROTOCOL= http
 */

let discoveryPort = process.env.DISCOVERY_PORT || 9099;
let discoveryHost = process.env.DISCOVERY_HOST || "localhost"
let discoveryProtocol = process.env.DISCOVERY_PROTOCOL || "http"

let discoveryBackend = new DiscoveryBackend({
  protocol: discoveryProtocol, 
  host: discoveryHost,
  port: discoveryPort,
  keyServices:"domain-demo"
})

/**
 * service: http://pico.calc.cleverapps.io
 * SERVICE_DOMAIN= http://pico.calc.cleverapps.io
 * PORT= 8080
 */
let port = process.env.PORT || 9090;

let serviceDomain = process.env.SERVICE_DOMAIN ||`http://localhost:${port}`

let record = {
  name: "calc",
  domain: serviceDomain,
  root:"/api",
  methods: [
    {name: "add1", type: "GET", path: "/add"},
    {name: "add2", type: "POST", path: "/add"}],
  metadata: {
    kind: "http"
  },
  instance: { 
    id: process.env.INSTANCE_ID, 
    type: process.env.INSTANCE_TYPE, 
    number: process.env.INSTANCE_NUMBER 
  }
}

let calcService = new Service({discoveryBackend: discoveryBackend, record: record})

// do something when you stop, quit, ...
// the unregistration from the Discovery Backend Server is automatic
calcService.stop = (cause) => {
  console.log(`👋 ${calcService.record.registration} ${cause}`)
}

/**
 * usage: curl http://pico.calc.cleverapps.io/api/add/40/2
 */
calcService.get({uri:`/api/add`, f: (request, response) => {
  let a = parseInt(request.params[0])
  let b = parseInt(request.params[1])
  response.sendJson({message: "Hello 🌍", from:"pico", result: a + b})
}})

/**
 * usage: curl -H "Content-Type: application/json" -X POST -d '{"a":21,"b":21}' http://pico.calc.cleverapps.io/api/add
 */
calcService.post({uri:`/api/add`, f: (request, response) => {
  let data = request.body
  response.sendJson({message: "Hey 👋", from:"pico" , result: data.a + data.b})
}})



/* === starting picoservice === */
calcService.start({port: port}, res => {
  res.when({
    Failure: error => console.log("😡 Houston? We have a problem!"),
    Success: port => {

      console.log(`🌍 calcService is listening on ${port}`)

      discoveryBackend.healthcheck(results => {
        results.when({
          Failure: error => console.log("😡 Houston? We have a problem!", error),
          Success: data => {
            console.log("😁 DiscoveryBackend is", data)
            /* === publishing picoservice === */
            
            calcService.createRegistration(registration => {
              registration.when({
                Failure: (err) => console.log("🙀", err),
                Success: record => { 
                  console.log("😻 registration is ok:", record) 
                                                    
                  // heartbeat
                  calcService.heartbeat({interval: 5000, f: res => {
                    res.when({ // if error -> the backend server is probably down
                      Failure: error => console.log("😡 update registration is ko", error),
                      Success: serviceRecord => console.log("😍 registration updated", serviceRecord)
                    })
                  }})                                  
                
                } // end of Success
              }) // end of when
            }) // end of create registration
          } // end of success
        }) // end of when
      }) // end of healthcheck
    } // end of success
  }) // end of when
}) // end of start

 /* === updating picoservice === */

/*
calcService.record.status = "UP"      
calcService.updateRegistration(registration => {
  registration.when({
    Failure: error => console.log("😡 update registration is ko", error),
    Success: value => console.log("😍 registration updated", value)
  })
})
*/






