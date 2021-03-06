// const morgan        = require('morgan');
const express       = require('express');
const cors          = require('cors');
const app           = express();

const routeBreeds   = require('./routes/breeds.js');
const routeAumigos  = require('./routes/aumigos.js');
const routeUsers    = require('./routes/users.js');

// Use:
// app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/uploads', express.static('uploads'));

// Cors:
app.use( (req, res, next) => {
    const serverAccepted = '*';

    res.header('Acess-Control-Allow-Origin', serverAccepted);
    res.header('Acess-Control-Allow-Header',
                'Origin, X-Requrested-With, Content-Type, Accept, Authorization'
                );

    next();
});

// Pages:
app.use('/breeds', routeBreeds);
app.use('/aumigos', routeAumigos);
app.use('/users', routeUsers);

// Page not found:
app.use((req, res, next) => {
    const error = new Error ('Error 404 Not Found');
    error.status = 404;
    next(error);
});

app.use( (error, req, res, next) => {
    res.status(error.status || 500);
    return res.send({
        erro: {
            return: error.message
        }
    })
});

module.exports = app;