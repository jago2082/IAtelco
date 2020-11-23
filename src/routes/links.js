const express = require('express');
const router = express.Router();
const url = require('url');
const multer = require('multer');
const path = require('path')

// PAYU
var md5 = require('md5');
const { payucf } = require('../keys');
const format = require('string-format');
const strtoupper = require('locutus/php/strings/strtoupper');
const nf = require('locutus/php/strings/number_format');
const RequestIp = require('@supercharge/request-ip');

const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');



// SET STORAGE
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'))
    },
    filename: function(req, file, cb) {

        var ext = path.extname(file.originalname || '').split('.');
        console.log(ext);
        cb(null, file.fieldname + '-' + Date.now() + '.' + ext[ext.length - 1])
    }
})

var upload = multer({ storage: storage })

router.get('/add', (req, res) => {
    var tmpurl = url.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: req.originalUrl
    });
    const link = tmpurl.replace('add', 'size');
    const gurl = link + "/" + req.user.idVendedor;
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var output = d.getFullYear() + '-' +
        (month < 10 ? '0' : '') + month + '-' +
        (day < 10 ? '0' : '') + day;
    res.render('links/add', { url: gurl, valido: output });
});

router.post('/add', async(req, res) => {
    const { title, url, description } = req.body;
    const newLink = {
        title,
        url,
        description,
        user_id: req.user.id
    };
    await pool.query('INSERT INTO links set ?', [newLink]);
    req.flash('success', 'Link Saved Successfully');
    res.redirect('/links');
});

router.get('/list', async(req, res) => {
    const xdespachar = await pool.query('SELECT * FROM compradores WHERE co_estado =? and idVendedor = ?', ['P', req.user.idVendedor]);
    const despachados = await pool.query('SELECT * FROM compradores WHERE co_estado =? and idVendedor = ?', ['D', req.user.idVendedor]);
    res.render('links/list', { xdespachar: xdespachar, despachados: despachados });
});


router.get('/cinfo/:id', async(req, res) => {
    const { id } = req.query;
    const info = await pool.query('SELECT * FROM compradores WHERE  idComprador = ?', [id]);

    res.render('links/info', { info: info[0] });
});

router.get('/chart', (req, res) => {
    res.render('links/chart');
});

router.get('/ahorro', (req, res) => {
    res.render('links/ahorro');
});

router.get('/tallas', (req, res) => {
    res.render('links/tallas');
});

router.get('/size/:id', async(req, res) => {
    const { id } = req.query;
    //await pool.query('DELETE FROM links WHERE ID = ?', [id]);
    res.render('links/upload', { id: id });
    // req.flash('success', 'Link Removed Successfully');
    // res.redirect('/links');
});

router.post('/uploadfile', upload.single('foto'), async(req, res, next) => {
    const file = req.file
    if (!file) {
        return next(req.flash('message', 'Por favor suba un archivo'))
    }
    const cms = Math.floor(Math.random() * (31 - 23)) + 23;
    const ancho = Math.floor(Math.random() * (11.5 - 9)) + 9;
    const customer = req.body.cliente;
    let newRecord = {
        idVendedor: req.body.id,
        co_centimetros: cms,
        co_ancho: ancho,
        co_nombre: customer,
        co_estado: 'P'
    };
    const result = await pool.query('INSERT INTO compradores SET ?', [newRecord]);
    if (result.affectedRows > 0) {
        var inserto = true;
    } else {
        var inserto = false;
    }
    const id = req.body.id;
    res.render('links/upload', { id: id, inserto: inserto });

});

router.get('/edit/:id', async(req, res) => {
    const { id } = req.query;
    const links = await pool.query('SELECT * FROM links WHERE id = ?', [id]);
    res.render('links/edit', { link: links[0] });
});

router.post('/edit/:id', async(req, res) => {
    const { id } = req.query;
    const { title, description, url } = req.body;
    const newLink = {
        title,
        description,
        url
    };
    await pool.query('UPDATE links set ? WHERE id = ?', [newLink, id]);
    req.flash('success', 'Link Updated Successfully');
    res.redirect('/links');
});


router.get('/payu', async(req, res) => {
    const ipclient = RequestIp.getClientIp(req);
    const TX_VALUE = parseInt(req.query['TX_VALUE']);
    const merchant_id = req.query['merchantId'];
    const referenceCode = req.query['referenceCode'];
    const New_value = nf(TX_VALUE, 1, '.', '');
    const currency = req.query['currency'];
    const transactionState = req.query['transactionState'];
    const firma_cadena = format('{0}~{1}~{2}~{3}~{4}~{5}', payucf.apikey, merchant_id, referenceCode, New_value, currency, transactionState);
    const firmacreada = md5(firma_cadena);
    const firma = req.query['signature'];
    const processingDate = req.query['processingDate'];



    let payur = {
        merchant_id: req.query['merchantId'],
        referenceCode: req.query['referenceCode'],
        tx_value: TX_VALUE,
        currency: req.query['currency'],
        transactionState: req.query['transactionState'],
        reference_pol: req.query['reference_pol'],
        cus: req.query['cus'],
        extra1: req.query['description'],
        pseBank: req.query['pseBank'],
        lapPaymentMethod: req.query['lapPaymentMethod'],
        transactionId: req.query['transactionId'],
    }

    if (transactionState == 4) {
        estadoTx = "Transacción aprobada";
        var datetime = new Date();
        let date = ("0" + datetime.getDate()).slice(-2);
        // current month
        let month = ("0" + (datetime.getMonth() + 1)).slice(-2);
        let year = datetime.getFullYear();
        let currentd = year + "/" + month + "/" + date;
        let faux = date + "/" + month + "/" + year;
        let ffin = sumaFecha(30, faux);
        console.log(ffin);
        // current year
        let newRecord = {
            fecha: processingDate,
            ip: ipclient,
            numero_pago: payur.cus,
            estado_pago: estadoTx,
            Paquetes_idPaquetes: 1,
            Vendedores_idVendedor: req.user.idVendedor,
            pasarela: 'PAYU',
            fecha_inicio: currentd,
            fecha_fin: ffin,
            estado_pagos_pasarela_idestado_pagos_pasarela: 4

        };
        const result = await pool.query('INSERT INTO historialpaquetesvendedor SET ?', [newRecord]);
        if (result.affectedRows > 0) {
            var inserto = true;
        } else {
            var inserto = false;
        }
    } else if (transactionState == 6) {
        estadoTx = "Transacción rechazada";
    } else if (transactionState == 104) {
        estadoTx = "Error";
    } else if (transactionState == 7) {
        estadoTx = "Transacción pendiente";
    } else {
        estadoTx = req.query['mensaje'];
    }

    payur.estadoTx = estadoTx;
    if (strtoupper(firma) == strtoupper(firmacreada)) {
        payur.esFirma = true;


    } else {
        payur.esFirma = false;
    }
    if (payur.pseBank == '') {
        payur.isBank = false;
    } else {
        payur.isBank = true;
    }

    console.log(payur);
    res.render('payu/response', { payu: payur });

});

sumaFecha = function(d, fecha) {
    var Fecha = new Date();
    var sFecha = fecha || (Fecha.getDate() + "/" + (Fecha.getMonth() + 1) + "/" + Fecha.getFullYear());
    var sep = sFecha.indexOf('/') != -1 ? '/' : '-';
    var aFecha = sFecha.split(sep);
    var fecha = aFecha[2] + '/' + aFecha[1] + '/' + aFecha[0];
    fecha = new Date(fecha);
    fecha.setDate(fecha.getDate() + parseInt(d));
    var anno = fecha.getFullYear();
    var mes = fecha.getMonth() + 1;
    var dia = fecha.getDate();
    mes = (mes < 10) ? ("0" + mes) : mes;
    dia = (dia < 10) ? ("0" + dia) : dia;
    var fechaFinal = anno + sep + mes + sep + dia;
    return (fechaFinal);
}

module.exports = router;