
    const printButtons = document.querySelectorAll('.print-button');

    printButtons.forEach(printButton => {
        printButton.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior

            // Get the URL of the printable version from the clicked link
            const printableURL = this.getAttribute('href');

            // Open a new window or tab with the printable content
            const newWindow = window.open(printableURL, '_blank');

            // Ensure that the window is loaded before printing
            newWindow.onload = function () {
                newWindow.print(); // Trigger the browser's print function
            };
        });
    });
