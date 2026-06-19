# TCS – NodeJS AWS

## Contexto

La empresa está desarrollando una plataforma de procesamiento de órdenes para comercios digitales.

El sistema debe permitir registrar órdenes, procesarlas de manera asíncrona y mantener trazabilidad de eventos para auditoría.

El objetivo de esta prueba es evaluar:

- diseño de APIs
- modelado lógico
- arquitectura backend
- razonamiento cloud en AWS
- claridad técnica
- calidad de decisiones
- historial de commits del repositorio

No se evaluará:

- cobertura completa de testing
- pipelines CI/CD
- infraestructura productiva completa
- UI/frontend

## Requisitos funcionales

| HU                  | Descripción                                                                                                                   | Criterios de aceptación                                                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar orden     | **Como** cliente del sistema<br>**Quiero** registrar una nueva orden<br>**Para** iniciar su procesamiento posterior.          | Debe existir un endpoint para crear órdenes.<br><br>La orden debe almacenar: identificador, customerId, monto, moneda, fecha de creación, estado.<br><br>El estado inicial debe ser: PENDING.<br><br>El API debe validar datos obligatorios.<br><br>El API debe retornar códigos HTTP consistentes.           |
| Consultar orden     | **Como** cliente del sistema<br>**Quiero** registrar una nueva orden<br>**Para** iniciar su procesamiento posterior.          | Debe existir un endpoint para consultar una orden por ID.<br><br>Debe retornar: información general, estado, timestamps relevantes.<br><br>Si la orden no existe: retornar error controlado.                                                                                                                  |
| Procesar orden      | **Como** motor de procesamiento<br>**Quiero** procesar órdenes pendientes<br>**Para** simular la aprobación de una operación. | Debe existir un endpoint o mecanismo de procesamiento.<br><br>El procesamiento debe ejecutarse de manera asíncrona o desacoplada.<br><br>La orden debe pasar por estados válidos: PENDING, PROCESSING, COMPLETED, FAILED.<br><br>Debe evitar estados inválidos.<br><br>Debe manejar errores de procesamiento. |
| Registrar auditoría | **Como** equipo de soporte<br>**Quiero** registrar eventos del sistema<br>**Para** mantener trazabilidad de operaciones.      | Cada cambio de estado debe generar un evento de auditoría.<br><br>La auditoría debe almacenar: orderId, evento, timestamp, estado previo y estado nuevo.                                                                                                                                                      |
| Seguridad básica    | **Como** equipo de plataforma<br>**Quiero** proteger los endpoints<br>**Para** evitar accesos no autorizados.                 | Los endpoints deben validar Bearer Token.<br><br>No es necesario implementar OAuth real.<br><br>La validación puede ser mock/simple.                                                                                                                                                                          |

## Requerimientos no funcionales

- NodeJS
- TypeScript
- Arquitectura Hexagonal o Clean Architecture
- Base de datos SQL o NoSQL
- Docker para despliegue local

## Documentación general

Debe incluir de forma explicada:

- diseño propuesto
- decisiones tomadas
- escenario AWS
- escalabilidad
- posibles mejoras (arquitectura, tecnologías, requisitos, etc.)
- instrucciones de ejecución
- instrucciones de uso del API

## Escenario AWS

La solución deberá explicar cómo sería desplegada en AWS, explicando qué puntos clave tendría en cuenta, qué opciones existen y por qué escoger una u otra.

## Entregable

Publicar todos los archivos en un repositorio público en donde se pueda tener acceso. Se recomienda validar que se pueda desplegar correctamente con las instrucciones de ejecución y tener en cuenta la ciberseguridad.

## Bonus (Opcional)

Suma puntos adicionales:

- despliegue real AWS
- OpenAPI / Swagger
- Front básico
- IaC básico
