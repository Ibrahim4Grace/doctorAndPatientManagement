
        // Get the current hour of the day
        const currentHour = new Date().getHours();

        // Define greeting messages
        let greetingMessage = "";

        if (currentHour >= 5 && currentHour < 12) {
            greetingMessage = "Good Morning User!";
        } else if (currentHour >= 12 && currentHour < 17) {
            greetingMessage = "Good Afternoon User!";
        } else {
            greetingMessage = "Good Evening User!";
        }

        // Display the greeting message on the web page
        const greetingElement = document.getElementById("greeting");
        greetingElement.textContent = greetingMessage;
