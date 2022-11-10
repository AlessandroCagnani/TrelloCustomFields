let t = window.TrelloPowerUp.iframe();

initCardBack()

async function initCardBack() {

    let cardFields = await new Promise((resolve, reject) => {
        t.getAll().then((context) => {
            let contextCard = context.card;

            let contextBoard = context.board.shared;
            let customFieldsOnBoard = contextBoard.customFields;

            let returnFields = contextCard ? contextCard.shared : {};

            customFieldsOnBoard.forEach((field) => {
                if (returnFields[field.name] == undefined) {

                    let newField = field;
                    field.value = null;

                    t.set('card', 'shared', field.name, newField);

                    returnFields[field.name] = newField;
                    returnFields[field.name].value = null;
                }
            });
            resolve(returnFields)
        })
    });

    console.log('[ fields retrived ] : ', cardFields);

    let fieldContainer = document.getElementById('fieldContainer');


    if (Object.keys(cardFields).length > 0) {

        const fieldsNames = Object.keys(cardFields);

        fieldsNames.forEach((field) => {

            let html = `
                            <div style="display: flex; flex-direction: column">
                                <label for="fieldValue" title=${cardFields[field].name}>${cardFields[field].name}</label>
                                <input type="text" name="fieldValue" id="fieldValue" 
                                    placeholder="Add text..">
                            </div>
                        `;

            let fieldDiv = new DOMParser().parseFromString(html, 'text/html').body.firstChild;

            if (cardFields[field].value != undefined) {
                fieldDiv.children[1].value = cardFields[field].value;
            }

            fieldContainer.appendChild(fieldDiv);

        });
    } else {
        fieldContainer.innerHTML = '<p>No fields added yet</p>';
    }


    /**
     * Adds event listener if there are inputs corresponding to any fields
     * @type {NodeListOf<Element>}
     */
    let inputs = document.querySelectorAll('#fieldContainer input');

    if (inputs) {
        inputs.forEach((input) => {
            input.addEventListener('keypress', (event) => {
                if (event.key == 'Enter') {
                    console.log('[input event] enter pressed - store the value');

                    let fieldName = event.target.parentNode.children[0].title;
                    let updatedField = cardFields[fieldName];
                    updatedField.value = event.target.value;

                    t.set('card', 'shared', `${fieldName}`, updatedField);


                    let body = {
                        newField: {
                            name: fieldName,
                            value: updatedField.value
                        },
                        cardId: t.getContext().card
                    }

                    $.ajax({
                        url: '/editField',
                        type: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        dataType: 'json',
                        data: JSON.stringify(body),
                        success: (response) => {
                            console.log("[client]: syncBlitz success\n", response);
                        }
                    })

                    event.target.blur();

                }
            })
        })
    }

}
