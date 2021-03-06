const express = require('express');
const router = express.Router();
const mysql = require('../mysql.js').pool;

const multer = require('multer');

const login = require('../../middleware/login.js');

const storageImage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './uploads/')
    },

    filename: function (req, file, callback) {
        
        callback(null, new Date().toISOString().slice(0, 19).replace(/:/g,"-") + "-" + file.originalname);
    }
});

const fileFilter = (req, file, callback) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        callback(null, true);
    } else {
        callback(null, false);
    }
};

const upload = multer({ 
        storage: storageImage,
        limits: {
            fileSize: (1024 * 1024) * 1 // 1 MB
        },
        fileFilter: fileFilter
});

// SELECT ALL DOGS
router.get('/', (req, res) => {
    
    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        conn.query(
            'SELECT * FROM adocao_db.aumigos;',
            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }

                const response = {
                    amount: results.length,
                    aumigos: results.map(aumigos => {
                        return {
                            id_aumigos: aumigos.id_aumigos,
                            name: aumigos.name,
                            request: {
                                method: 'GET',
                                description: `SHOW MORE ABOUT ${aumigos.name.toUpperCase()}`,
                                url: 'http://localhost:3003/aumigos/' + aumigos.id_aumigos
                            }
                        }
                    })
                }

                return res.status(200).send(response);
            }
        )
    });
});

// INSERT DOGS

router.post('/', upload.single('image-aumigo'), login.authorizationRequire, (req, res) => {

    const Req = {
        name: req.body.name.trimStart().trimEnd(),
        age: req.body.age,
        gender: req.body.gender.toUpperCase().charAt(0),
        breed_id_breed: req.body.breed_id_breed,
        file: req.file === undefined ? null : req.file.path,
        owner: req.user.id_user
    }

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        const DataTime_created = new Date().toLocaleString();

        conn.query('INSERT INTO adocao_db.aumigos (name, age, gender, breed_id_breed, updated_at, created_at, image_aumigos, owner_id) VALUE (?, ?, ?, ?, ?, ?, ?, ?);',
            [   Req.name, 
                Req.age, 
                Req.gender, 
                Req.breed_id_breed, 
                DataTime_created, 
                DataTime_created,
                Req.file,
                Req.owner
            ], function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    })
                }

                const response = {
                    msg: 'Aumigo has been created',
                    aumigo_created: {
                        id_aumigo: results.insertId,
                        name: Req.name,
                        age: Req.age,
                        gender: Req.gender,
                        breed_id_breed: Req.breed_id_breed,
                        created_at: DataTime_created,
                        updated_at: DataTime_created,
                        image_aumigo: Req.file
                    },
                    request: {
                        method: "POST",
                        description: "ADD A NEW AUMIGO",
                        url: "http://localhost:3003/aumigos",
                        body: {
                            name: "String",
                            age: "Number",
                            gender: "String",
                            breed_id_breed: "Number"
                        }
                    }
                }

                return res.status(201).send(response);

            });
    });

});

// SELECT DOGS BY ID
router.get('/id/:id_aumigos', (req, res) => {
    const id = req.params.id_aumigos

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        conn.query(            
            `SELECT aumigos.id_aumigos, aumigos.name, aumigos.age, aumigos.gender, breed.breed, aumigos.image_aumigos, aumigos.owner_id, users.name as name_user ` +
            `FROM aumigos ` +
            `INNER JOIN breed ` +
            `ON breed_id_breed = breed.id_breed ` +
            `LEFT JOIN users ON(users.id_user = aumigos.owner_id) ` +
            `WHERE aumigos.id_aumigos = ?;`,
            [id],
            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }

                if (results.length == 0) {
                    return res.status(404).send({
                        msg: 'ID not found.'
                    })
                }

                const response = {
                    id_aumigos: id,
                    name: results[0].name,
                    age: results[0].age,
                    gender: results[0].gender,
                    breed: results[0].breed,
                    name_user: results[0].name_user,
                    image_aumigos: results[0].image_aumigos,
                    
                    request: {
                        method: "GET",
                        description: "SHOW SPECIFY AUMIGO DETAILS",
                        url: "http://localhost:3003/aumigos/id/" + id
                    }
                }

                res.status(200).send(response);
            }
        )
    });
});

// SELECT DOGS BY LETTERS
router.get('/search/:letters', (req, res) => {
    const letters = req.params.letters

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        conn.query(            
            `SELECT * FROM adocao_db.aumigos WHERE name LIKE "%${letters}%";`,
            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }

                if (results.length == 0) {
                    return res.status(404).send({
                        msg: 'Dog not found.'
                    });
                }

                const response = {
                    results,
                    // id_aumigos: results[0].id_aumigos,
                    // name: letters,
                    // age: results[0].age,
                    // gender: results[0].gender,
                    // breed: results[0].breed,
                    // created_at: results[0].created_at,
                    // updated_at: results[0].updated_at,
                    // image_aumigos: results[0].image_aumigos,
                    
                    request: {
                        method: "GET",
                        description: "SHOW SEARCH",
                        url: "http://localhost:3003/aumigos/search/" + letters
                    }
                }

                res.status(200).send(response);
            }
        )
    });
});

// SELECT MYLIST DOGS
router.get('/mylist', login.authorizationRequire, (req, res) => {
    const id = req.user.id_user;

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        conn.query(            
            `SELECT (id_aumigos) FROM adocao_db.aumigos WHERE adocao_db.aumigos.owner_id = ?;`,
            [id],
            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }

                if (results.length == 0) {
                    return res.status(404).send({
                        msg: 'Dog not found.'
                    });
                }

                const response = {
                    id_aumigos: results,
                    
                    request: {
                        method: "GET",
                        description: "SHOW SEARCH",
                        url: "http://localhost:3003/aumigos"
                    }
                }

                res.status(200).send(response);
            }
        )
    });
});


// UPDATE DOGS
router.patch('/', (req, res) => {
    const Req = {
        id_aumigos: req.body.id_aumigos,
        name: req.body.name.trimStart().trimEnd(),
        age: req.body.age,
        gender: req.body.gender.toUpperCase().charAt(0),
        breed_id_breed: req.body.breed_id_breed,
        updated_at: new Date().toLocaleString()
    }

    const queryUpdate =
        `UPDATE adocao_db.aumigos ` +
        `SET name = '${Req.name}', ` +
        `age = ${Req.age}, ` +
        `gender = '${Req.gender}', ` +
        `breed_id_breed = ${Req.breed_id_breed}, ` +
        `updated_at = '${Req.updated_at}' ` +
        `WHERE id_aumigos = ${Req.id_aumigos};`;

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }); }

        conn.query(queryUpdate,

            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }
                
                const response = {
                    msg: 'Breed has been updated',
                    aumigo_updated: {
                        id_aumigos: Req.id_aumigos,
                        name: Req.name,
                        age: Req.age,
                        gender: Req.gender,
                        breed: Req.breed_id_breed,
                        created_at: Req.created_at,
                        updated_at: Req.updated_at,
                    },
                    request: {
                        method: "GET",
                        description: "SHOW SPECIFY AUMIGO DETAILS",
                        url: "http://localhost:3003/aumigos/" + Req.id_aumigos
                    }
                }

                return res.status(202).send(response);
            }
        )
    })
});

// DELETE DOGS
router.delete('/', (req, res) => {
    const Req = {
        id_breed: req.body.id_breed
    };

    const queryDelete =
        `DELETE FROM adocao_db.aumigos ` +
        `WHERE id_breed = ${Req.id_breed};`;

    mysql.getConnection(function (error, conn) {
        if (error) { return res.status(500).send({ error: error }) }

        conn.query(queryDelete,
            function (error, results, field) {
                conn.release();

                if (error) {
                    return res.status(500).send({
                        error: error,
                        response: null
                    });
                }

                const response = {
                    msg: 'Breed has been deleted',
                    request: {
                        method: "POST",
                        description: "ADD A NEW BREED",
                        url: "http://localhost:3003/aumigos",
                        body: {
                            name: "String",
                            age: "Number",
                            gender: "String",
                            breed_id_breed: "Number"
                        }
                    }
                }

                res.status(202).send(response);
            }

        )

    });
});



module.exports = router;