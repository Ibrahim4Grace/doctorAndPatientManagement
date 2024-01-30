'use strict';

const prevBtns = document.querySelectorAll(".btn-prev");
const nextBtns = document.querySelectorAll(".btn-next");
const progress = document.getElementById("progress");
const formSteps = document.querySelectorAll(".form-step");
const progressSteps = document.querySelectorAll(".progress-step");
const btnComplete = document.querySelector(".btn-complete");

btnComplete.addEventListener("click", () => {
document.getElementsByTagName('form').submit
})
let formStepsNum = 0;
let experienceNum = 1;


function updateFormSteps() {

formSteps.forEach(formStep => {
formStep.classList.contains("active") &&
formStep.classList.remove("active");
})
formSteps[formStepsNum].classList.add("active");
}

function updateProgressBar() {
progressSteps.forEach((progressStep, idx) => {
if (idx < formStepsNum + 1) {
progressStep.classList.add("active");
} else {
progressStep.classList.remove("active");
}
})

const progressActive = document.querySelectorAll(".progress-step.active");
progress.style.width = ((progressActive.length - 1) / (progressSteps.length - 1)) * 100 + '%';
}


nextBtns.forEach(btn => {
btn.addEventListener("click", function () {
    // Check if all required fields in the current step are filled and valid
    const currentStepFields = formSteps[formStepsNum].querySelectorAll('[required]');
    let allFieldsFilledAndValid = true;

    currentStepFields.forEach(field => {
        if (!field.checkValidity()) {
            allFieldsFilledAndValid = false;
        }
    });

     // Check if passwords match
    const passwordField = document.querySelector('input[name="password"]');
    const confirmPasswordField = document.querySelector('input[name="password2"]');
    if (passwordField.value !== confirmPasswordField.value) {
        allFieldsFilledAndValid = false;
        alert("Passwords do not match");
    }

    // Check if in the image section and no image is uploaded
    if (formStepsNum === 2) {
        const imageField = document.querySelector('input[name="image"]');
        const selectedFiles = imageField.files;
        if (selectedFiles.length === 0) {
            allFieldsFilledAndValid = false;
            alert("Please upload an image");
        }
    }

    // If all required fields are filled and valid, proceed to the next step
    if (allFieldsFilledAndValid) {
        formStepsNum++;
        updateFormSteps();
        updateProgressBar();
        console.log("Moving to the next step");
    } else {
        // If some required fields are not filled or not valid, show an alert or handle it accordingly
        alert("Please fill in all fields correctly before proceeding.");
    }
});
});


prevBtns.forEach(btn => {
btn.addEventListener("click", function () {
formStepsNum--;
updateFormSteps();
updateProgressBar();
console.log("kk")
})
})

