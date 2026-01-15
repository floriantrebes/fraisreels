"use strict";

const DASHBOARD_ENDPOINT = "/api/dashboard/";
const TABLE_BODY_ID = "people-table";
const YEAR_INPUT_ID = "year-input";
const REFRESH_BUTTON_ID = "refresh-button";
const SEARCH_INPUT_ID = "search-input";
const STATUS_MESSAGE_ID = "status-message";
const FORM_STATUS_ID = "form-status";
const TOTAL_DEDUCTION_ID = "total-deduction";
const TOTAL_MEALS_ID = "total-meals";
const TOTAL_OTHER_ID = "total-other";
const TOTAL_VEHICLES_ID = "total-vehicles";
const DETAIL_PANEL_ID = "detail-panel";
const HOUSEHOLD_FORM_ID = "household-form";
const PERSON_FORM_ID = "person-form";
const VEHICLE_FORM_ID = "vehicle-form";
const MILEAGE_FORM_ID = "mileage-form";
const MEAL_FORM_ID = "meal-form";
const OTHER_EXPENSE_FORM_ID = "other-expense-form";

const API_ENDPOINTS = {
  households: "/households",
  persons: "/persons",
  vehicles: "/vehicles",
  mileage: "/mileage",
  meals: "/meals",
  otherExpenses: "/other-expenses",
};

const DEFAULT_SORT = {
  key: "total",
  direction: "desc",
};

const state = {
  people: [],
  filtered: [],
  sortKey: DEFAULT_SORT.key,
  sortDirection: DEFAULT_SORT.direction,
  selectedId: null,
};

/**
 * Role: Format a number to euro currency.
 * Inputs: value - numeric amount.
 * Outputs: Formatted string in euros.
 * Errors: Returns "0 €" on invalid values.
 */
function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "0 €";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Role: Get a DOM element by id.
 * Inputs: elementId - DOM element id.
 * Outputs: HTMLElement.
 * Errors: Throws if the element is missing.
 */
function getElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element introuvable: ${elementId}`);
  }
  return element;
}

/**
 * Role: Update a DOM element text.
 * Inputs: elementId and text.
 * Outputs: None.
 * Errors: Throws if the element is missing.
 */
function setText(elementId, text) {
  const element = getElement(elementId);
  element.textContent = text;
}

/**
 * Role: Get a form element by id.
 * Inputs: formId - DOM form id.
 * Outputs: HTMLFormElement.
 * Errors: Throws if the form is missing or invalid.
 */
function getForm(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    throw new Error(`Formulaire introuvable: ${formId}`);
  }
  if (!(form instanceof HTMLFormElement)) {
    throw new Error(`Élément invalide: ${formId}`);
  }
  return form;
}

/**
 * Role: Read a named input value from a form.
 * Inputs: form and field name.
 * Outputs: Trimmed string value.
 * Errors: Throws if the field is missing.
 */
function getFormValue(form, name) {
  const element = form.elements.namedItem(name);
  if (!element) {
    throw new Error(`Champ introuvable: ${name}`);
  }
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Champ invalide: ${name}`);
  }
  return element.value.trim();
}

/**
 * Role: Parse a required text field.
 * Inputs: value, label, and max length.
 * Outputs: Trimmed string value.
 * Errors: Throws if invalid.
 */
function parseTextField(value, label, maxLength) {
  if (!value) {
    throw new Error(`${label} requis.`);
  }
  if (maxLength && value.length > maxLength) {
    throw new Error(`${label} trop long.`);
  }
  return value;
}

/**
 * Role: Parse an integer field with optional bounds.
 * Inputs: value, label, min, max.
 * Outputs: Number.
 * Errors: Throws if invalid.
 */
function parseIntegerField(value, label, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} invalide.`);
  }
  if (min !== null && parsed < min) {
    throw new Error(`${label} doit être ≥ ${min}.`);
  }
  if (max !== null && parsed > max) {
    throw new Error(`${label} doit être ≤ ${max}.`);
  }
  return parsed;
}

/**
 * Role: Parse a decimal field with optional bounds.
 * Inputs: value, label, min.
 * Outputs: Number.
 * Errors: Throws if invalid.
 */
function parseDecimalField(value, label, min) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} invalide.`);
  }
  if (min !== null && parsed < min) {
    throw new Error(`${label} doit être ≥ ${min}.`);
  }
  return parsed;
}

/**
 * Role: Set the form status message.
 * Inputs: message.
 * Outputs: None.
 * Errors: Throws if status element is missing.
 */
function setFormStatus(message) {
  setText(FORM_STATUS_ID, message);
}

/**
 * Role: Extract a readable error message.
 * Inputs: error object.
 * Outputs: Message string.
 * Errors: None.
 */
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erreur inattendue.";
}

/**
 * Role: Send a JSON POST request.
 * Inputs: endpoint and payload.
 * Outputs: Parsed JSON response.
 * Errors: Throws on non-OK responses.
 */
async function postJson(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    const message = errorText || `Erreur ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

/**
 * Role: Build the detail panel HTML.
 * Inputs: person - dashboard person summary.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildDetailPanel(person) {
  if (!person) {
    return "<p class=\"hint\">Sélectionnez une personne.</p>";
  }
  const header = (
    `<h4>${person.first_name} ${person.last_name}</h4>`
  );
  if (person.vehicle_summaries.length === 0) {
    return (
      `${header}<p class=\"hint\">Aucun véhicule.</p>`
    );
  }
  const items = person.vehicle_summaries
    .map((vehicle) => {
      const deduction = formatCurrency(vehicle.deduction);
      return (
        "<div class=\"vehicle-item\">" +
          `<h4>${vehicle.vehicle_name}</h4>` +
          `<p>${vehicle.total_km} km • ${deduction}</p>` +
        "</div>"
      );
    })
    .join("");
  return (
    `${header}<div class=\"vehicle-list\">${items}</div>`
  );
}

/**
 * Role: Render the detail panel.
 * Inputs: person - dashboard person summary.
 * Outputs: None.
 * Errors: Throws if the panel is missing.
 */
function renderDetail(person) {
  const panel = getElement(DETAIL_PANEL_ID);
  panel.innerHTML = buildDetailPanel(person);
}

/**
 * Role: Summarize totals for the dashboard.
 * Inputs: people list.
 * Outputs: Totals object.
 * Errors: None.
 */
function summarizeTotals(people) {
  return people.reduce(
    (totals, person) => {
      totals.meals += person.meals_deduction;
      totals.other += person.other_expenses;
      totals.vehicles += person.vehicle_deduction_total;
      totals.total += person.total_deduction;
      return totals;
    },
    {
      meals: 0,
      other: 0,
      vehicles: 0,
      total: 0,
    }
  );
}

/**
 * Role: Render the summary cards.
 * Inputs: people list.
 * Outputs: None.
 * Errors: Throws if elements are missing.
 */
function renderSummary(people) {
  const totals = summarizeTotals(people);
  setText(TOTAL_MEALS_ID, formatCurrency(totals.meals));
  setText(TOTAL_OTHER_ID, formatCurrency(totals.other));
  setText(TOTAL_VEHICLES_ID, formatCurrency(totals.vehicles));
  setText(TOTAL_DEDUCTION_ID, formatCurrency(totals.total));
}

/**
 * Role: Build the table row for a person.
 * Inputs: person summary and selected state.
 * Outputs: HTML row.
 * Errors: None.
 */
function buildRow(person, isSelected) {
  const rowClass = isSelected ? " class=\"selected\"" : "";
  return (
    `<tr data-person-id=\"${person.person_id}\"${rowClass}>` +
      `<td>${person.first_name} ${person.last_name}</td>` +
      `<td>${person.household_name}</td>` +
      `<td>${formatCurrency(person.meals_deduction)}</td>` +
      `<td>${formatCurrency(person.other_expenses)}</td>` +
      `<td>${formatCurrency(person.vehicle_deduction_total)}</td>` +
      `<td>${formatCurrency(person.total_deduction)}</td>` +
    "</tr>"
  );
}

/**
 * Role: Render the people table.
 * Inputs: people list and selected person id.
 * Outputs: None.
 * Errors: Throws if the table body is missing.
 */
function renderTable(people, selectedId) {
  const tableBody = getElement(TABLE_BODY_ID);
  const rows = people
    .map((person) => buildRow(person, person.person_id === selectedId))
    .join("");
  tableBody.innerHTML = rows;
}

/**
 * Role: Filter people based on a search query.
 * Inputs: people list and query.
 * Outputs: Filtered list.
 * Errors: None.
 */
function filterPeople(people, query) {
  if (!query) {
    return people;
  }
  const lower = query.toLowerCase();
  return people.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`;
    const vehicleNames = person.vehicle_summaries
      .map((vehicle) => vehicle.vehicle_name)
      .join(" ");
    return (
      fullName.toLowerCase().includes(lower) ||
      person.household_name.toLowerCase().includes(lower) ||
      vehicleNames.toLowerCase().includes(lower)
    );
  });
}

/**
 * Role: Sort people by the selected key.
 * Inputs: people list, sort key, and direction.
 * Outputs: Sorted list.
 * Errors: None.
 */
function sortPeople(people, sortKey, direction) {
  const sorted = [...people];
  sorted.sort((left, right) => {
    const isAsc = direction === "asc";
    if (sortKey === "person") {
      const nameLeft = `${left.last_name} ${left.first_name}`;
      const nameRight = `${right.last_name} ${right.first_name}`;
      return isAsc
        ? nameLeft.localeCompare(nameRight)
        : nameRight.localeCompare(nameLeft);
    }
    if (sortKey === "household") {
      return isAsc
        ? left.household_name.localeCompare(right.household_name)
        : right.household_name.localeCompare(left.household_name);
    }
    const valueLeft = left[sortKey] ?? 0;
    const valueRight = right[sortKey] ?? 0;
    if (valueLeft === valueRight) {
      return 0;
    }
    if (isAsc) {
      return valueLeft > valueRight ? 1 : -1;
    }
    return valueLeft < valueRight ? 1 : -1;
  });
  return sorted;
}

/**
 * Role: Update the dashboard view.
 * Inputs: None.
 * Outputs: None.
 * Errors: Throws if DOM elements are missing.
 */
function updateView() {
  const query = getElement(SEARCH_INPUT_ID)
    .value.trim();
  const filtered = filterPeople(state.people, query);
  const sorted = sortPeople(
    filtered,
    state.sortKey,
    state.sortDirection
  );
  state.filtered = sorted;
  renderSummary(state.filtered);
  renderTable(state.filtered, state.selectedId);
  renderDetail(
    state.filtered.find((person) => person.person_id === state.selectedId)
  );
}

/**
 * Role: Update the status message.
 * Inputs: message text.
 * Outputs: None.
 * Errors: Throws if the status element is missing.
 */
function setStatusMessage(message) {
  setText(STATUS_MESSAGE_ID, message);
}

/**
 * Role: Build payload for household creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildHouseholdPayload(form) {
  const name = parseTextField(
    getFormValue(form, "name"),
    "Nom du foyer",
    120
  );
  return {
    name,
  };
}

/**
 * Role: Build payload for person creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildPersonPayload(form) {
  const householdId = parseIntegerField(
    getFormValue(form, "household_id"),
    "ID du foyer",
    1,
    null
  );
  const firstName = parseTextField(
    getFormValue(form, "first_name"),
    "Prénom",
    80
  );
  const lastName = parseTextField(
    getFormValue(form, "last_name"),
    "Nom",
    80
  );
  return {
    household_id: householdId,
    first_name: firstName,
    last_name: lastName,
  };
}

/**
 * Role: Build payload for vehicle creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildVehiclePayload(form) {
  const personId = parseIntegerField(
    getFormValue(form, "person_id"),
    "ID de la personne",
    1,
    null
  );
  const name = parseTextField(
    getFormValue(form, "name"),
    "Nom du véhicule",
    120
  );
  const powerCv = parseIntegerField(
    getFormValue(form, "power_cv"),
    "Puissance fiscale",
    1,
    null
  );
  return {
    person_id: personId,
    name,
    power_cv: powerCv,
  };
}

/**
 * Role: Build payload for mileage creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildMileagePayload(form) {
  const personId = parseIntegerField(
    getFormValue(form, "person_id"),
    "ID de la personne",
    1,
    null
  );
  const vehicleId = parseIntegerField(
    getFormValue(form, "vehicle_id"),
    "ID du véhicule",
    1,
    null
  );
  const year = parseIntegerField(
    getFormValue(form, "year"),
    "Année",
    2000,
    2100
  );
  const month = parseIntegerField(
    getFormValue(form, "month"),
    "Mois",
    1,
    12
  );
  const km = parseDecimalField(
    getFormValue(form, "km"),
    "Kilomètres",
    0
  );
  return {
    person_id: personId,
    vehicle_id: vehicleId,
    year,
    month,
    km,
  };
}

/**
 * Role: Build payload for meal expense creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildMealPayload(form) {
  const personId = parseIntegerField(
    getFormValue(form, "person_id"),
    "ID de la personne",
    1,
    null
  );
  const year = parseIntegerField(
    getFormValue(form, "year"),
    "Année",
    2000,
    2100
  );
  const month = parseIntegerField(
    getFormValue(form, "month"),
    "Mois",
    1,
    12
  );
  const mealCost = parseDecimalField(
    getFormValue(form, "meal_cost"),
    "Montant repas",
    0
  );
  return {
    person_id: personId,
    year,
    month,
    meal_cost: mealCost,
  };
}

/**
 * Role: Build payload for other expense creation.
 * Inputs: form element.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildOtherExpensePayload(form) {
  const personId = parseIntegerField(
    getFormValue(form, "person_id"),
    "ID de la personne",
    1,
    null
  );
  const year = parseIntegerField(
    getFormValue(form, "year"),
    "Année",
    2000,
    2100
  );
  const description = parseTextField(
    getFormValue(form, "description"),
    "Description",
    160
  );
  const amount = parseDecimalField(
    getFormValue(form, "amount"),
    "Montant",
    0
  );
  const attachmentPath = getFormValue(form, "attachment_path");
  return {
    person_id: personId,
    year,
    description,
    amount,
    attachment_path: attachmentPath || null,
  };
}

/**
 * Role: Handle form submissions.
 * Inputs: submit event, form id, endpoint, payload builder, success message.
 * Outputs: None.
 * Errors: Displays error status on failure.
 */
async function handleFormSubmit(
  event,
  formId,
  endpoint,
  buildPayload,
  successMessage
) {
  event.preventDefault();
  const form = getForm(formId);
  setFormStatus("Envoi des données...");
  try {
    const payload = buildPayload(form);
    await postJson(endpoint, payload);
    form.reset();
    setFormStatus(successMessage);
    refreshDashboard();
  } catch (error) {
    setFormStatus(getErrorMessage(error));
  }
}

/**
 * Role: Fetch dashboard data for a given year.
 * Inputs: year number.
 * Outputs: Dashboard response JSON.
 * Errors: Throws if the request fails.
 */
async function fetchDashboard(year) {
  const response = await fetch(
    `${DASHBOARD_ENDPOINT}${year}`
  );
  if (!response.ok) {
    const message = `Erreur ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

/**
 * Role: Load dashboard data and refresh UI.
 * Inputs: None.
 * Outputs: None.
 * Errors: Displays error on failure.
 */
async function refreshDashboard() {
  const year = Number.parseInt(
    getElement(YEAR_INPUT_ID).value,
    10
  );
  if (!Number.isFinite(year)) {
    setStatusMessage("Année invalide.");
    return;
  }
  setStatusMessage("Chargement des données...");
  try {
    const response = await fetchDashboard(year);
    state.people = response.people.map((person) => ({
      ...person,
      meals: person.meals_deduction,
      other: person.other_expenses,
      vehicles: person.vehicle_deduction_total,
      total: person.total_deduction,
      person: `${person.first_name} ${person.last_name}`,
      household: person.household_name,
    }));
    state.selectedId = null;
    updateView();
    setStatusMessage(
      `${state.people.length} personne(s) chargée(s) pour ${year}.`
    );
  } catch (error) {
    setStatusMessage("Impossible de charger le tableau de bord.");
  }
}

/**
 * Role: Handle table sorting interactions.
 * Inputs: event.
 * Outputs: None.
 * Errors: None.
 */
function handleSort(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const key = target.getAttribute("data-key");
  if (!key) {
    return;
  }
  if (state.sortKey === key) {
    state.sortDirection = state.sortDirection === "asc"
      ? "desc"
      : "asc";
  } else {
    state.sortKey = key;
    state.sortDirection = "desc";
  }
  updateSortIndicators();
  updateView();
}

/**
 * Role: Update the table header sort indicators.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function updateSortIndicators() {
  const headers = document.querySelectorAll("th[data-key]");
  headers.forEach((header) => {
    const key = header.getAttribute("data-key");
    if (key === state.sortKey) {
      header.classList.add("sorted");
    } else {
      header.classList.remove("sorted");
    }
  });
}

/**
 * Role: Handle table row selection.
 * Inputs: event.
 * Outputs: None.
 * Errors: None.
 */
function handleRowSelection(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const row = target.closest("tr");
  if (!row) {
    return;
  }
  const personId = Number.parseInt(
    row.dataset.personId,
    10
  );
  if (!Number.isFinite(personId)) {
    return;
  }
  state.selectedId = personId;
  updateView();
}

/**
 * Role: Initialize event listeners.
 * Inputs: None.
 * Outputs: None.
 * Errors: Throws if elements are missing.
 */
function initializeDashboard() {
  getElement(REFRESH_BUTTON_ID).addEventListener(
    "click",
    refreshDashboard
  );
  getElement(SEARCH_INPUT_ID).addEventListener(
    "input",
    updateView
  );
  getForm(HOUSEHOLD_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      HOUSEHOLD_FORM_ID,
      API_ENDPOINTS.households,
      buildHouseholdPayload,
      "Foyer créé."
    )
  );
  getForm(PERSON_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      PERSON_FORM_ID,
      API_ENDPOINTS.persons,
      buildPersonPayload,
      "Personne créée."
    )
  );
  getForm(VEHICLE_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      VEHICLE_FORM_ID,
      API_ENDPOINTS.vehicles,
      buildVehiclePayload,
      "Véhicule créé."
    )
  );
  getForm(MILEAGE_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      MILEAGE_FORM_ID,
      API_ENDPOINTS.mileage,
      buildMileagePayload,
      "Kilométrage ajouté."
    )
  );
  getForm(MEAL_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      MEAL_FORM_ID,
      API_ENDPOINTS.meals,
      buildMealPayload,
      "Frais de repas ajoutés."
    )
  );
  getForm(OTHER_EXPENSE_FORM_ID).addEventListener(
    "submit",
    (event) => handleFormSubmit(
      event,
      OTHER_EXPENSE_FORM_ID,
      API_ENDPOINTS.otherExpenses,
      buildOtherExpensePayload,
      "Frais divers ajoutés."
    )
  );
  document.querySelector("table")
    ?.addEventListener("click", handleRowSelection);
  document.querySelector("thead")
    ?.addEventListener("click", handleSort);
  updateSortIndicators();
  refreshDashboard();
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
