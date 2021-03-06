var servicios = {};
var empleados = {};
alertError = { titulo: "¡Ha ocurrido un error!", href: '#registrarVenta', tipo: 'error', mensaje: '' }
alertCorrecto = { titulo: "¡Correcto!", href: '#registrarVenta', tipo: 'correcto', mensaje: '' }

$(document).ready(function () {    
    ajax('http://80.211.145.146/barber/inc/consultas.php', 'tipo=Empleados', cargarEmpleados);    
    ajax('http://80.211.145.146/barber/inc/consultas.php', 'tipo=Servicios', cargarServicios);

    cargarFecha();
    $('select[name="servicios"]').change(function () {
        idServicio = $('select[name="servicios"] option:selected').val();

        if (idServicio == 0) {
            $('input[name="valorServicio"]').val('');
        } else {
            var found = getValServCode(idServicio);
            $('input[name="valorServicio"]').val(found[0].valorSugerido);
        }
    });

    $("#addItmSrv").click(agregarItem);
    $("#guardar").click(guardarRegistro);

    $(".number").number(true);
});

function guardarRegistro() {
    barberoSel = $('select[name="barberos"] option:selected').val();
    parametros = { titulo: "¡Advertencia!", href: '#registrarVenta', tipo: 'advertencia', mensaje: '' };

    if (barberoSel == 0) {
        parametros.mensaje = "Debes seleccionar un barbero";
        alerta(parametros);
    } else if ($('#detalleRegistro').find('tr').length - 1 == 0) {
        parametros.mensaje = "Debes agregar al menos un servicio";
        alerta(parametros);
    } else {
        var items = [];
        var itemsFacturados = $('#detalleRegistro').find('tr').length - 1;
        var idBarbero = $('select[name="barberos"] option:selected').val();

        for (var i = 0; i < itemsFacturados; i++) {
            var fila = $('#detalleRegistro').find('tr')[i + 1];
            servicioTemp = $(fila).find('td')[0];
            valorTemp = $(fila).find('td a.valorServicioItm')[0];

            var foundId = getValServDescrip($(servicioTemp).html());

            var itemInd = {
                servicio: foundId[0].idServicio,
                valor: numeral($(valorTemp).html()).value()
            }
            items.push(itemInd);
        }

        var itemsJSON = JSON.stringify(items);
        
        $.ajax({
            async: true,
            beforeSend: function () {
                parametros = { titulo: "Procesando solicitud", tipo: 'loader', mensaje: '<div class="loader-spinner"></div>' };
                alerta(parametros);
            },
            type: "POST",
            url: 'http://localhost/barber/inc/registrarVenta.php',
            data:
                'item=' + itemsJSON +
                '&barbero=' + idBarbero,
            dataType: "html",
            success: function (data) {
                $('.alerta').remove();
                var respuesta = data.split("|");

                if (respuesta[0] == '0') {
                    alertCorrecto.href = 'reload';
                    alertCorrecto.mensaje = respuesta[1];
                    alerta(alertCorrecto);
                } else if (respuesta[0] == '-1') {
                    alertError.mensaje = '<b>Descripción: </b>' + respuesta[1];
                    alerta(alertError);
                } else {
                    alertError.mensaje = '<b>Descripción: </b>' + respuesta;
                    alerta(alertError);
                }
            }
        });
    }
}

function cargarServicios(data) {
    var respuesta = $.parseJSON(data);
    if (respuesta['codigo_error']) {
        alertError.mensaje = '<b>Descripción: </b>' + respuesta['descripcion'] + '<br><br> Debes registrar al menos un servicio para poder facturar.';
        alerta(alertError);
    } else {
        servicios = respuesta;
        for ($i = 0; $i < servicios.length; $i++) {
            $('select[name="servicios"]').append(
                '<option value="' + servicios[$i].idServicio + '">' +
                servicios[$i].Descripcion +
                '</option>'
            );

            $('select[name="servicios"').selectric('refresh');
        }
    }
}

function cargarEmpleados(data) {    
    var respuesta = $.parseJSON(data);
    if (respuesta['codigo_error']) {
        alertError.mensaje = '<b>Descripción: </b>' + respuesta['descripcion'] + '<br><br> Debes registrar empleados para poder facturar un servicio.';
        alerta(alertError);
    } else {
        empleados = respuesta;
        for ($i = 0; $i < empleados.length; $i++) {            
            if(parseInt(empleados[$i].Estado) == 1){                
                $('select[name="barberos"]').append(
                    '<option value="' + empleados[$i].idEmpleado + '">' 
                    + empleados[$i].Descripcion 
                    + '</option>'
                );
    
                $('select[name="barberos"]').selectric('refresh');
            }

        }
    }
}

function agregarItem() {
    parametros = { titulo: "Advertencia", href: '#registrarVenta', tipo: 'advertencia', mensaje: '' };

    if ($('select[name="servicios"] option:selected').val() == 0) {
        parametros.mensaje = 'Debes seleccionar un servicio';
        alerta(parametros);
    } else if ($('input[name="valorServicio"]').val().length < 1) {
        parametros.mensaje = 'Ingresa un valor para el servicio';
        alerta(parametros);
    } else {
        var valorServicio = numeral($('input[name="valorServicio"]').val()).format('0,0');
        $('<tr>' +
            '<td>' + $('select[name="servicios"] option:selected').html() + '</td>' +
            '<td>$ <a class="valorServicioItm">' + valorServicio + '</a></td>' +
            '<td class="td-button">' +
            '<button type="button" class="btn-circle btn-blanco eliminarItem">' +
            '<i class="material-icons">delete</i>' +
            '</button>' +
            '</td>' +
            '</tr>')
            .appendTo($('#detalleRegistro tbody'));


        calcularTotal('sumar', valorServicio);


        // Inicializar entradas
        $('select[name="servicios"').prop('selectedIndex', 0).selectric('refresh');
        $('input[name="valorServicio"]').val('');
        $(".eliminarItem").unbind("click").click(eliminarItem);
        // !Inicializar entradas        
    }
}

function eliminarItem() {
    $(this).closest('tr').hide('fade', 'fast', function () {
        $(this).closest('tr').remove();
    });
    var elemento = $(this).closest('tr');
    var valorItem = elemento.find(".valorServicioItm").html();
    calcularTotal('restar', valorItem);
}


function calcularTotal(operacion, valor) {
    // Calculo valor total            
    var valorTotal = numeral($('#valorTotal').html()).value()
    var nuevoValor = numeral(valor).value();
    if (operacion == "restar") {
        var nuevoTotal = parseInt(valorTotal) - parseInt(nuevoValor);
    } else if (operacion == "sumar") {
        var nuevoTotal = parseInt(valorTotal) + parseInt(nuevoValor);
    }

    $('#valorTotal').html(numeral(nuevoTotal).format('0,0'));
    // !Calculo valor total
}

function getValServCode(code) {
    return servicios.filter(
        function (servicios) {
            return servicios.idServicio == code
        }
    );
}

function getValServDescrip(code) {
    return servicios.filter(
        function (servicios) {
            return servicios.Descripcion == code
        }
    );
}

function ajax(url, data, funcion) {
    return $.ajax({
        async: true,
        type: "POST",
        url: url,
        data: data,
        dataType: "html",
        success: function (data) {
            funcion(data);
        }
    });
}

function cargarFecha() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    today = dd + '/' + mm + '/' + yyyy;
    $('#fechaActual').html(today);
}
