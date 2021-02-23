const car = {
    precio: 2000,
    color: "rojo",
    puertas: 3
}

if (car.precio < 2000 && car.color === "rojo" || 
        car.puertas === 4 ){
    console.log("Es mio!")
}

else {
    console.log("No es para mi")
}

