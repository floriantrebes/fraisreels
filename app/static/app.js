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
const ADMIN_REFRESH_ID = "admin-refresh";
const ADMIN_STATUS_ID = "admin-status";
const HOUSEHOLDS_TABLE_ID = "households-table";
const PERSONS_TABLE_ID = "persons-table";
const VEHICLES_TABLE_ID = "vehicles-table";
const HOUSEHOLD_UPDATE_FORM_ID = "household-update-form";
const HOUSEHOLD_DELETE_FORM_ID = "household-delete-form";
const PERSON_UPDATE_FORM_ID = "person-update-form";
const PERSON_DELETE_FORM_ID = "person-delete-form";
const VEHICLE_UPDATE_FORM_ID = "vehicle-update-form";
const VEHICLE_DELETE_FORM_ID = "vehicle-delete-form";
const MILEAGE_UPDATE_FORM_ID = "mileage-update-form";
const MILEAGE_DELETE_FORM_ID = "mileage-delete-form";
const MEAL_UPDATE_FORM_ID = "meal-update-form";
const MEAL_DELETE_FORM_ID = "meal-delete-form";
const OTHER_UPDATE_FORM_ID = "other-update-form";
const OTHER_DELETE_FORM_ID = "other-delete-form";
const PERSON_DETAIL_ENDPOINT = "/api/people/";

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
  detail: null,
  admin: {
    households: [],
    persons: [],
    vehicles: [],
  },
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
 * Role: Format a number for French locale.
 * Inputs: value and maximum digits.
 * Outputs: Formatted numeric string.
 * Errors: Returns "0" on invalid values.
 */
function formatNumber(value, maximumDigits) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: maximumDigits,
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
 * Role: Send a JSON request with a payload.
 * Inputs: endpoint, method, and payload.
 * Outputs: Parsed JSON response or null.
 * Errors: Throws on non-OK responses.
 */
async function sendJson(endpoint, method, payload) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (payload) {
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(endpoint, options);
  const text = await response.text();
  if (!response.ok) {
    const message = text || `Erreur ${response.status}`;
    throw new Error(message);
  }
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

/**
 * Role: Send a JSON GET request.
 * Inputs: endpoint.
 * Outputs: Parsed JSON response.
 * Errors: Throws on non-OK responses.
 */
async function getJson(endpoint) {
  const response = await fetch(endpoint);
  const text = await response.text();
  if (!response.ok) {
    const message = text || `Erreur ${response.status}`;
    throw new Error(message);
  }
  return JSON.parse(text);
}

/**
 * Role: Build a metric item HTML string.
 * Inputs: label and value.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildMetricItem(label, value) {
  return (
    "<div class=\"metric-item\">" +
      `<span>${label}</span>` +
      `<strong>${value}</strong>` +
    "</div>"
  );
}

/**
 * Role: Build a detail table section.
 * Inputs: title, headers, and body HTML.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildDetailTable(title, headers, body) {
  const headerCells = headers.map((cell) => (
    `<th>${cell}</th>`
  )).join("");
  return (
    "<div class=\"detail-block\">" +
      `<h4>${title}</h4>` +
      "<div class=\"detail-table\">" +
        "<table>" +
          "<thead>" +
            `<tr>${headerCells}</tr>` +
          "</thead>" +
          `<tbody>${body}</tbody>` +
        "</table>" +
      "</div>" +
    "</div>"
  );
}

/**
 * Role: Build an empty table row message.
 * Inputs: message and column count.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildEmptyRow(message, columns) {
  return `<tr><td colspan="${columns}">${message}</td></tr>`;
}

/**
 * Role: Build mileage table HTML.
 * Inputs: mileage entries.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildMileageTable(entries) {
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.vehicle_name}</td>` +
      `<td>${entry.month}</td>` +
      `<td>${formatNumber(entry.km, 1)} km</td>` +
    "</tr>"
  ));
  const body = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucune entrée.", 4);
  return buildDetailTable(
    "Kilométrage détaillé",
    ["ID", "Véhicule", "Mois", "Km"],
    body
  );
}

/**
 * Role: Build meal expense table HTML.
 * Inputs: meal entries.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildMealTable(entries) {
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.month}</td>` +
      `<td>${formatCurrency(entry.meal_cost)}</td>` +
      `<td>${formatCurrency(entry.deductible_amount)}</td>` +
    "</tr>"
  ));
  const body = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucun repas.", 4);
  return buildDetailTable(
    "Repas",
    ["ID", "Mois", "Montant", "Déductible"],
    body
  );
}

/**
 * Role: Build other expense table HTML.
 * Inputs: other expense entries.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildOtherTable(entries) {
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.description}</td>` +
      `<td>${formatCurrency(entry.amount)}</td>` +
      `<td>${entry.attachment_path || "-"}</td>` +
    "</tr>"
  ));
  const body = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucun frais.", 4);
  return buildDetailTable(
    "Autres frais",
    ["ID", "Description", "Montant", "Justificatif"],
    body
  );
}

/**
 * Role: Build the detail panel HTML.
 * Inputs: person summary and detail data.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildDetailPanel(person, detail) {
  if (!person) {
    return "<p class=\"hint\">Sélectionnez une personne.</p>";
  }
  if (!detail) {
    return "<p class=\"hint\">Chargement des opérations...</p>";
  }
  const header = (
    `<h4>${person.first_name} ${person.last_name}</h4>`
  );
  const metrics = [
    buildMetricItem(
      "Kilomètres",
      `${formatNumber(detail.mileage_total_km, 1)} km`
    ),
    buildMetricItem(
      "Déduction véhicules",
      formatCurrency(detail.mileage_deduction_total)
    ),
    buildMetricItem(
      "Déduction repas",
      formatCurrency(detail.meals_deduction_total)
    ),
    buildMetricItem(
      "Autres frais",
      formatCurrency(detail.other_expenses_total)
    ),
    buildMetricItem(
      "Total annuel",
      formatCurrency(detail.total_deduction)
    ),
  ].join("");
  return (
    `${header}` +
    "<div class=\"detail-metrics\">" +
      metrics +
    "</div>" +
    buildMileageTable(detail.mileage_entries) +
    buildMealTable(detail.meal_expenses) +
    buildOtherTable(detail.other_expenses)
  );
}

/**
 * Role: Render the detail panel.
 * Inputs: person summary and detail data.
 * Outputs: None.
 * Errors: Throws if the panel is missing.
 */
function renderDetail(person, detail) {
  const panel = getElement(DETAIL_PANEL_ID);
  panel.innerHTML = buildDetailPanel(person, detail);
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
  const selectedPerson = state.filtered.find(
    (person) => person.person_id === state.selectedId
  );
  renderDetail(selectedPerson, state.detail);
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
 * Role: Update the admin status message.
 * Inputs: message text.
 * Outputs: None.
 * Errors: Throws if the status element is missing.
 */
function setAdminStatus(message) {
  setText(ADMIN_STATUS_ID, message);
}

/**
 * Role: Read the selected year input.
 * Inputs: None.
 * Outputs: Parsed year number or null.
 * Errors: None.
 */
function getSelectedYear() {
  const year = Number.parseInt(
    getElement(YEAR_INPUT_ID).value,
    10
  );
  if (!Number.isFinite(year)) {
    return null;
  }
  return year;
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
    100
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
    100
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
 * Role: Build payload for household update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildHouseholdUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID du foyer",
    1,
    null
  );
  const name = parseTextField(
    getFormValue(form, "name"),
    "Nom du foyer",
    100
  );
  return {
    id,
    payload: {
      name,
    },
  };
}

/**
 * Role: Build payload for person update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildPersonUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID de la personne",
    1,
    null
  );
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
    id,
    payload: {
      household_id: householdId,
      first_name: firstName,
      last_name: lastName,
    },
  };
}

/**
 * Role: Build payload for vehicle update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildVehicleUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID du véhicule",
    1,
    null
  );
  const personId = parseIntegerField(
    getFormValue(form, "person_id"),
    "ID de la personne",
    1,
    null
  );
  const name = parseTextField(
    getFormValue(form, "name"),
    "Nom du véhicule",
    100
  );
  const powerCv = parseIntegerField(
    getFormValue(form, "power_cv"),
    "Puissance fiscale",
    1,
    null
  );
  return {
    id,
    payload: {
      person_id: personId,
      name,
      power_cv: powerCv,
    },
  };
}

/**
 * Role: Build payload for mileage update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildMileageUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID du kilométrage",
    1,
    null
  );
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
    id,
    payload: {
      person_id: personId,
      vehicle_id: vehicleId,
      year,
      month,
      km,
    },
  };
}

/**
 * Role: Build payload for meal update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildMealUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID du repas",
    1,
    null
  );
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
    id,
    payload: {
      person_id: personId,
      year,
      month,
      meal_cost: mealCost,
    },
  };
}

/**
 * Role: Build payload for other expense update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildOtherUpdatePayload(form) {
  const id = parseIntegerField(
    getFormValue(form, "id"),
    "ID du frais",
    1,
    null
  );
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
    id,
    payload: {
      person_id: personId,
      year,
      description,
      amount,
      attachment_path: attachmentPath || null,
    },
  };
}

/**
 * Role: Read a deletion payload from a form.
 * Inputs: form element and label.
 * Outputs: Identifier number.
 * Errors: Throws on invalid input.
 */
function buildDeletePayload(form, label) {
  return parseIntegerField(
    getFormValue(form, "id"),
    label,
    1,
    null
  );
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
    await sendJson(endpoint, "POST", payload);
    form.reset();
    setFormStatus(successMessage);
    refreshDashboard();
    refreshAdminData();
  } catch (error) {
    setFormStatus(getErrorMessage(error));
  }
}

/**
 * Role: Handle update form submissions.
 * Inputs: submit event, form id, endpoint, payload builder, success message.
 * Outputs: None.
 * Errors: Displays error status on failure.
 */
async function handleUpdateFormSubmit(
  event,
  formId,
  endpoint,
  buildPayload,
  successMessage
) {
  event.preventDefault();
  const form = getForm(formId);
  setFormStatus("Mise à jour en cours...");
  try {
    const { id, payload } = buildPayload(form);
    await sendJson(`${endpoint}/${id}`, "PUT", payload);
    form.reset();
    setFormStatus(successMessage);
    refreshDashboard();
    refreshAdminData();
  } catch (error) {
    setFormStatus(getErrorMessage(error));
  }
}

/**
 * Role: Handle delete form submissions.
 * Inputs: submit event, form id, endpoint, id builder, success message.
 * Outputs: None.
 * Errors: Displays error status on failure.
 */
async function handleDeleteFormSubmit(
  event,
  formId,
  endpoint,
  buildId,
  successMessage
) {
  event.preventDefault();
  const form = getForm(formId);
  setFormStatus("Suppression en cours...");
  try {
    const id = buildId(form);
    await sendJson(`${endpoint}/${id}`, "DELETE");
    form.reset();
    setFormStatus(successMessage);
    refreshDashboard();
    refreshAdminData();
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
 * Role: Render household rows in the admin table.
 * Inputs: households list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderHouseholdsTable(households) {
  const tableBody = getElement(HOUSEHOLDS_TABLE_ID);
  const rows = households.map((household) => (
    "<tr>" +
      `<td>${household.id}</td>` +
      `<td>${household.name}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Render person rows in the admin table.
 * Inputs: people list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderPersonsTable(people) {
  const tableBody = getElement(PERSONS_TABLE_ID);
  const rows = people.map((person) => (
    "<tr>" +
      `<td>${person.id}</td>` +
      `<td>${person.household_name}</td>` +
      `<td>${person.first_name} ${person.last_name}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Render vehicle rows in the admin table.
 * Inputs: vehicles list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderVehiclesTable(vehicles) {
  const tableBody = getElement(VEHICLES_TABLE_ID);
  const rows = vehicles.map((vehicle) => (
    "<tr>" +
      `<td>${vehicle.id}</td>` +
      `<td>${vehicle.person_name}</td>` +
      `<td>${vehicle.name}</td>` +
      `<td>${vehicle.power_cv}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Fetch admin lists and refresh UI.
 * Inputs: None.
 * Outputs: None.
 * Errors: Displays error on failure.
 */
async function refreshAdminData() {
  setAdminStatus("Chargement des référentiels...");
  try {
    const [households, persons, vehicles] = await Promise.all([
      getJson(API_ENDPOINTS.households),
      getJson(API_ENDPOINTS.persons),
      getJson(API_ENDPOINTS.vehicles),
    ]);
    state.admin.households = households;
    state.admin.persons = persons;
    state.admin.vehicles = vehicles;
    renderHouseholdsTable(households);
    renderPersonsTable(persons);
    renderVehiclesTable(vehicles);
    setAdminStatus(
      `${households.length} foyers · ${persons.length} ` +
      `personnes · ${vehicles.length} véhicules.`
    );
  } catch (error) {
    setAdminStatus("Impossible de charger les référentiels.");
  }
}

/**
 * Role: Load dashboard data and refresh UI.
 * Inputs: None.
 * Outputs: None.
 * Errors: Displays error on failure.
 */
async function refreshDashboard() {
  const year = getSelectedYear();
  if (year === null) {
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
    state.detail = null;
    updateView();
    setStatusMessage(
      `${state.people.length} personne(s) chargée(s) pour ${year}.`
    );
  } catch (error) {
    setStatusMessage("Impossible de charger le tableau de bord.");
  }
}

/**
 * Role: Load detail operations for the selected person.
 * Inputs: personId.
 * Outputs: None.
 * Errors: Displays error message on failure.
 */
async function refreshPersonDetail(personId) {
  if (!personId) {
    state.detail = null;
    updateView();
    return;
  }
  const year = getSelectedYear();
  if (year === null) {
    setStatusMessage("Année invalide.");
    return;
  }
  state.detail = null;
  updateView();
  try {
    const detail = await getJson(
      `${PERSON_DETAIL_ENDPOINT}${personId}/details/${year}`
    );
    state.detail = detail;
    updateView();
  } catch (error) {
    setStatusMessage("Impossible de charger le détail annuel.");
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
  refreshPersonDetail(personId);
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
  getElement(ADMIN_REFRESH_ID).addEventListener(
    "click",
    refreshAdminData
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
  getForm(HOUSEHOLD_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      HOUSEHOLD_UPDATE_FORM_ID,
      API_ENDPOINTS.households,
      buildHouseholdUpdatePayload,
      "Foyer mis à jour."
    )
  );
  getForm(HOUSEHOLD_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      HOUSEHOLD_DELETE_FORM_ID,
      API_ENDPOINTS.households,
      (form) => buildDeletePayload(form, "ID du foyer"),
      "Foyer supprimé."
    )
  );
  getForm(PERSON_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      PERSON_UPDATE_FORM_ID,
      API_ENDPOINTS.persons,
      buildPersonUpdatePayload,
      "Personne mise à jour."
    )
  );
  getForm(PERSON_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      PERSON_DELETE_FORM_ID,
      API_ENDPOINTS.persons,
      (form) => buildDeletePayload(form, "ID de la personne"),
      "Personne supprimée."
    )
  );
  getForm(VEHICLE_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      VEHICLE_UPDATE_FORM_ID,
      API_ENDPOINTS.vehicles,
      buildVehicleUpdatePayload,
      "Véhicule mis à jour."
    )
  );
  getForm(VEHICLE_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      VEHICLE_DELETE_FORM_ID,
      API_ENDPOINTS.vehicles,
      (form) => buildDeletePayload(form, "ID du véhicule"),
      "Véhicule supprimé."
    )
  );
  getForm(MILEAGE_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      MILEAGE_UPDATE_FORM_ID,
      API_ENDPOINTS.mileage,
      buildMileageUpdatePayload,
      "Kilométrage mis à jour."
    )
  );
  getForm(MILEAGE_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      MILEAGE_DELETE_FORM_ID,
      API_ENDPOINTS.mileage,
      (form) => buildDeletePayload(form, "ID du kilométrage"),
      "Kilométrage supprimé."
    )
  );
  getForm(MEAL_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      MEAL_UPDATE_FORM_ID,
      API_ENDPOINTS.meals,
      buildMealUpdatePayload,
      "Repas mis à jour."
    )
  );
  getForm(MEAL_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      MEAL_DELETE_FORM_ID,
      API_ENDPOINTS.meals,
      (form) => buildDeletePayload(form, "ID du repas"),
      "Repas supprimé."
    )
  );
  getForm(OTHER_UPDATE_FORM_ID).addEventListener(
    "submit",
    (event) => handleUpdateFormSubmit(
      event,
      OTHER_UPDATE_FORM_ID,
      API_ENDPOINTS.otherExpenses,
      buildOtherUpdatePayload,
      "Frais divers mis à jour."
    )
  );
  getForm(OTHER_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => handleDeleteFormSubmit(
      event,
      OTHER_DELETE_FORM_ID,
      API_ENDPOINTS.otherExpenses,
      (form) => buildDeletePayload(form, "ID du frais"),
      "Frais divers supprimés."
    )
  );
  document.querySelector("table")
    ?.addEventListener("click", handleRowSelection);
  document.querySelector("thead")
    ?.addEventListener("click", handleSort);
  updateSortIndicators();
  refreshDashboard();
  refreshAdminData();
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
