const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const pool = require('../database');
const helpers = require('./helpers');

passport.use('local.signin', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async(req, username, password, done) => {
    const rows = await pool.query('SELECT * FROM vendedores  WHERE ve_email =?', [username]);
    if (rows.length > 0) {
        const user = rows[0];
        const validPassword = await helpers.matchPassword(password, user.ve_password)
        if (validPassword) {
            done(null, user, req.flash('success', 'Bienvenido ' + user.ve_Nombre));
        } else {
            done(null, false, req.flash('message', 'Datos Incorrectos'));
        }
    } else {
        return done(null, false, req.flash('message', 'El usuario no existe.'));
    }
}));

passport.use('local.signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, async(req, email, password, done) => {
    //console.log(req.body);
    let newUser = {
        ve_Nombre: req.body.nombre,
        ve_email: email,
        ve_Nombre: req.body.nombre,
        ve_telefono: req.body.telefono,
        ve_nombre_tienda: req.body.tienda,
        ve_links: 0,
        ve_pago: 'N',
        Estado_idEstado: 1,
        Tipo_usuario_idTipo_usuario: 1
    };
    newUser.ve_password = await helpers.encryptPassword(password);
    // Saving in the Database
    const result = await pool.query('INSERT INTO vendedores SET ? ', newUser);
    newUser.idVendedor = result.insertId;
    return done(null, newUser);
}));

passport.serializeUser((user, done) => {
    done(null, user.idVendedor);
});

passport.deserializeUser(async(idVendedor, done) => {
    const rows = await pool.query('SELECT * FROM vendedores AS v left JOIN historialpaquetesvendedor AS h ON h.Vendedores_idVendedor = v.idVendedor  WHERE v.idVendedor =?', [idVendedor]);
    const user = rows[0];
    if (user.fecha_fin) {
        user.menu = true;
        user.pago = true;
        user.links = false;



    } else {
        if (user.ve_links > 3) {
            user.menu = false;
            user.pago = false;


        } else {
            user.menu = true;
            user.links = true;

        }
    }

    done(null, user);
});