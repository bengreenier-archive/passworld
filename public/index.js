$(document).ready(function () {
    $.get('/passwords', function (data) {
        for (var i = 0 ; i < data.length ; i++) {
            // TODO: wtf? why is this parse not done
            addPassword(JSON.parse(data[i]))
        }
    })

    $("#addSubmit").click(function () {
        
        // TODO: make this configurable
        var exp = new Date()
        exp.setFullYear(exp.getFullYear() + 1)
        var model = {
            expiration: exp.toISOString()
        }

        // process the fields
        $("#addForm input").each(function (i, element) {
            model[$(element).attr("id").substr("input".length).toLowerCase()] = $(element).val()
        })

        // update
        $.ajax('/passwords', {
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify([model])
        }).then(function () {
            $("#addForm input").each(function (i, element) {
                $(element).val("")
            })
            addPassword(model)
        }, function (err) {
            // TODO: show notification that this failed
            console.error(err)
        })
    })
})

function addPassword(data) {
    var elem = $("#password-template")
        .clone()

    elem.attr("id", "")

    elem.find(".thumbnail img")
        .attr("src", "")
        .attr("alt", "giphy " + data.name.toLowerCase())
    elem.find(".caption h3")
        .text(data.name)
        
    elem.find(".caption p")
        .text(data.description)

    elem.find(".caption a").each(function (i, element) {
        $(element).attr("data-name", data.name)
    })

    elem.find(".delete").on('click', function () {
        var domElement = $(this).parent().parent().parent()

        var secretName = $(this).attr("data-name")

        // TODO: prompt for confirmation
        $.ajax('/passwords/' + secretName, {
            method: "DELETE"
        }).then(function () {
            domElement.fadeOut()
        }, function (err) {
            $("#error").slideDown()
            $("#error-code").text(JSON.stringify(err))
            console.error(err)
        })
    })

    elem.find(".view").on('click', function () {
        var secretName = $(this).attr("data-name")
        
        $("#viewModalLabel").text(secretName)
        $.get('/passwords/' + secretName, function (data) {
            var data = JSON.parse(data)

            // TODO: use moment to make expiration pretty
            $("#viewModalBody").html("<p>" + data.value + "</p><p>" + data.expiration + "</p>")
            $("#viewModal").modal('show')
        })
    })

    elem.appendTo("#passwords")
    elem.fadeIn()
    $.get("https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=" + data.name.replace(' ', '+').toLowerCase(), function (data) {
        elem
        .find(".thumbnail img")
        .attr("src", data.data.image_url)
    })
}