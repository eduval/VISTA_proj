document.addEventListener('DOMContentLoaded', () => {

    const dateInput = document.getElementById('book_date');
    const timeInput = document.getElementById('book_people');
    const nextBtn = document.getElementById('nextStep');

    const dateError = document.getElementById('dateError');
    const timeError = document.getElementById('timeError');

    /* ===============================
       Restore saved values
    =============================== */
    const savedDate = localStorage.getItem('service_date');
    const savedTime = localStorage.getItem('service_time');

    if (savedDate) dateInput.value = savedDate;
    if (savedTime) timeInput.value = savedTime;

    /* ===============================
       Validation
    =============================== */
    function validateStep() {
        let valid = true;

        if (!dateInput.value) {
            dateInput.classList.add('is-invalid');
            dateError.classList.remove('d-none');
            valid = false;
        } else {
            dateInput.classList.remove('is-invalid');
            dateError.classList.add('d-none');
        }

        if (!timeInput.value) {
            timeInput.classList.add('is-invalid');
            timeError.classList.remove('d-none');
            valid = false;
        } else {
            timeInput.classList.remove('is-invalid');
            timeError.classList.add('d-none');
        }

        if (valid) {
            nextBtn.classList.remove('disabled');
            nextBtn.removeAttribute('aria-disabled');
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.setAttribute('aria-disabled', 'true');
        }

        return valid;
    }

    /* ===============================
       Event listeners
    =============================== */
    dateInput.addEventListener('change', validateStep);
    timeInput.addEventListener('change', validateStep);

    nextBtn.addEventListener('click', (e) => {
        if (!validateStep()) {
            e.preventDefault();
            return;
        }

        localStorage.setItem('service_date', dateInput.value);
        localStorage.setItem('service_time', timeInput.value);
    });

    /* ===============================
       Initial check
    =============================== */
    validateStep();
});

