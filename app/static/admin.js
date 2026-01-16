"use strict";

const ADMIN_REFRESH_ID = "admin-refresh";
const ADMIN_STATUS_ID = "admin-status";
const PERSON_SELECT_ID = "admin-person-select";
const YEAR_INPUT_ID = "admin-year-input";
const OPERATIONS_REFRESH_ID = "admin-operations-refresh";
const OPERATIONS_STATUS_ID = "admin-operations-status";
const HOUSEHOLDS_TABLE_ID = "admin-households-table";
const PERSONS_TABLE_ID = "admin-persons-table";
const VEHICLES_TABLE_ID = "admin-vehicles-table";
const MILEAGE_SCALE_TABLE_ID = "admin-mileage-scale";
const MILEAGE_TABLE_ID = "mileage-entries-table";
const MEAL_TABLE_ID = "meal-entries-table";
const OTHER_TABLE_ID = "other-entries-table";
const MILEAGE_EDIT_FORM_ID = "mileage-edit-form";
const MEAL_EDIT_FORM_ID = "meal-edit-form";
const OTHER_EDIT_FORM_ID = "other-edit-form";
const MILEAGE_DELETE_FORM_ID = "mileage-delete-form";
const MEAL_DELETE_FORM_ID = "meal-delete-form";
const OTHER_DELETE_FORM_ID = "other-delete-form";

const API_ENDPOINTS = {
  households: "/households",
  persons: "/persons",
  vehicles: "/vehicles",
  mileageScale: "/api/mileage-scale",
  personDetails: "/api/people/",
  mileage: "/mileage",
  meals: "/meals",
  otherExpenses: "/other-expenses",
};

const DEFAULT_YEAR = 2024;
const MENU_OPEN_CLASS = "menu-open";

const state = {
  households: [],
  persons: [],
  vehicles: [],
  mileageScale: [],
  selectedPersonId: null,
  selectedYear: DEFAULT_YEAR,
  detail: null,
  openMenu: null,
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
 * Role: Get a dialog element by id.
 * Inputs: dialogId - DOM dialog id.
 * Outputs: HTMLDialogElement.
 * Errors: Throws if the dialog is missing or invalid.
 */
function getDialog(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (!dialog) {
    throw new Error(`Fenêtre introuvable: ${dialogId}`);
  }
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error(`Fenêtre invalide: ${dialogId}`);
  }
  return dialog;
}

/**
 * Role: Open a dialog by id.
 * Inputs: dialogId.
 * Outputs: None.
 * Errors: Throws if the dialog is missing.
 */
function openDialog(dialogId) {
  const dialog = getDialog(dialogId);
  if (!dialog.open) {
    dialog.showModal();
  }
}

/**
 * Role: Close a dialog for the given form.
 * Inputs: form element.
 * Outputs: None.
 * Errors: None.
 */
function closeDialogForForm(form) {
  const dialog = form.closest("dialog");
  if (!(dialog instanceof HTMLDialogElement)) {
    return;
  }
  if (dialog.open) {
    dialog.close();
  }
}

/**
 * Role: Send a JSON request.
 * Inputs: endpoint, method, and payload.
 * Outputs: Parsed JSON response or null.
 * Errors: Throws on non-OK responses.
 */
async function sendJson(endpoint, method, payload) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : null,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Erreur ${response.status}`);
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
    throw new Error(text || `Erreur ${response.status}`);
  }
  return JSON.parse(text);
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
 * Role: Safely read a field value from a container.
 * Inputs: container and field name.
 * Outputs: Trimmed field value.
 * Errors: Throws if the field is missing.
 */
function readFieldValue(container, fieldName) {
  const input = container.querySelector(`[name="${fieldName}"]`);
  if (!input) {
    throw new Error(`Champ introuvable: ${fieldName}`);
  }
  if (!(input instanceof HTMLInputElement) &&
      !(input instanceof HTMLSelectElement)) {
    throw new Error(`Champ invalide: ${fieldName}`);
  }
  return input.value.trim();
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
 * Role: Update the operations status message.
 * Inputs: message text.
 * Outputs: None.
 * Errors: Throws if the status element is missing.
 */
function setOperationsStatus(message) {
  setText(OPERATIONS_STATUS_ID, message);
}

/**
 * Role: Format a mileage scale label.
 * Inputs: rate and fixed amounts.
 * Outputs: Formatted label.
 * Errors: None.
 */
function formatScaleLabel(rate, fixed) {
  const rateLabel = `${formatNumber(rate, 3)} €/km`;
  if (!fixed) {
    return rateLabel;
  }
  return `${rateLabel} + ${formatCurrency(fixed)}`;
}

/**
 * Role: Render household table rows.
 * Inputs: households list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderHouseholds(households) {
  const tableBody = getElement(HOUSEHOLDS_TABLE_ID);
  const rows = households.map((row) => (
    "<tr>" +
      `<td>${row.id}</td>` +
      `<td>${row.name}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Render person table rows.
 * Inputs: person list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderPersons(people) {
  const tableBody = getElement(PERSONS_TABLE_ID);
  const rows = people.map((row) => (
    "<tr>" +
      `<td>${row.id}</td>` +
      `<td>${row.household_name}</td>` +
      `<td>${row.first_name} ${row.last_name}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Render vehicle table rows.
 * Inputs: vehicle list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderVehicles(vehicles) {
  const tableBody = getElement(VEHICLES_TABLE_ID);
  const rows = vehicles.map((row) => (
    "<tr>" +
      `<td>${row.id}</td>` +
      `<td>${row.person_name}</td>` +
      `<td>${row.name}</td>` +
      `<td>${row.power_cv}</td>` +
    "</tr>"
  ));
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Render mileage scale table rows.
 * Inputs: mileage scale list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderMileageScale(scale) {
  const tableBody = getElement(MILEAGE_SCALE_TABLE_ID);
  const rows = scale.map((entry) => {
    const first = entry.brackets[0];
    const second = entry.brackets[1];
    const third = entry.brackets[2];
    return (
      "<tr>" +
        `<td>${entry.power_cv}</td>` +
        `<td>${formatScaleLabel(first.rate, first.fixed)}</td>` +
        `<td>${formatScaleLabel(second.rate, second.fixed)}</td>` +
        `<td>${formatScaleLabel(third.rate, third.fixed)}</td>` +
      "</tr>"
    );
  });
  tableBody.innerHTML = rows.join("");
}

/**
 * Role: Build a dropdown of persons.
 * Inputs: person list.
 * Outputs: None.
 * Errors: Throws if select is missing.
 */
function renderPersonSelect(people) {
  const select = getElement(PERSON_SELECT_ID);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error("Sélecteur invalide.");
  }
  const options = people.map((person) => (
    `<option value="${person.id}">` +
      `${person.first_name} ${person.last_name}` +
    "</option>"
  ));
  select.innerHTML = options.join("");
  if (people.length) {
    state.selectedPersonId = people[0].id;
    select.value = String(state.selectedPersonId);
  } else {
    state.selectedPersonId = null;
  }
}

/**
 * Role: Render vehicle options for a person.
 * Inputs: select element and person id.
 * Outputs: None.
 * Errors: Throws if select is invalid.
 */
function renderVehicleOptions(select, personId) {
  const options = state.vehicles
    .filter((vehicle) => vehicle.person_id === personId)
    .map((vehicle) => (
      `<option value="${vehicle.id}">${vehicle.name}</option>`
    ));
  select.innerHTML = options.join("");
}

/**
 * Role: Update the add-row vehicle dropdown.
 * Inputs: person id.
 * Outputs: None.
 * Errors: Throws if select is missing.
 */
function updateMileageVehicleSelect(personId) {
  const table = getElement(MILEAGE_TABLE_ID);
  const select = table.querySelector("tfoot select");
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error("Sélecteur véhicule invalide.");
  }
  renderVehicleOptions(select, personId);
}

/**
 * Role: Build an empty row for entry tables.
 * Inputs: message and column count.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildEmptyRow(message, columns) {
  return `<tr><td colspan="${columns}">${message}</td></tr>`;
}

/**
 * Role: Build action menu HTML for an entry row.
 * Inputs: entry type and entry id.
 * Outputs: HTML string.
 * Errors: None.
 */
function buildActionMenu(entryType, entryId) {
  return (
    "<div class=\"row-actions\">" +
      "<button" +
        " type=\"button\"" +
        " class=\"menu-trigger\"" +
        ` data-entry-type=\"${entryType}\"` +
        ` data-entry-id=\"${entryId}\"` +
        " data-action=\"menu\"" +
      ">⋯</button>" +
      "<div class=\"menu-panel\">" +
        "<button" +
          " type=\"button\"" +
          " data-action=\"edit\"" +
          ` data-entry-type=\"${entryType}\"` +
          ` data-entry-id=\"${entryId}\"` +
        ">Modifier</button>" +
        "<button" +
          " type=\"button\"" +
          " data-action=\"delete\"" +
          ` data-entry-type=\"${entryType}\"` +
          ` data-entry-id=\"${entryId}\"` +
        ">Supprimer</button>" +
      "</div>" +
    "</div>"
  );
}

/**
 * Role: Render mileage entry rows.
 * Inputs: mileage entry list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderMileageEntries(entries) {
  const table = getElement(MILEAGE_TABLE_ID);
  const body = table.querySelector("tbody");
  if (!body) {
    throw new Error("Tableau trajets introuvable.");
  }
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.vehicle_name}</td>` +
      `<td>${entry.month}</td>` +
      `<td>${formatNumber(entry.km, 1)} km</td>` +
      `<td>${buildActionMenu("mileage", entry.id)}</td>` +
    "</tr>"
  ));
  body.innerHTML = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucun trajet.", 5);
}

/**
 * Role: Render meal entry rows.
 * Inputs: meal entry list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderMealEntries(entries) {
  const table = getElement(MEAL_TABLE_ID);
  const body = table.querySelector("tbody");
  if (!body) {
    throw new Error("Tableau repas introuvable.");
  }
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.month}</td>` +
      `<td>${formatCurrency(entry.meal_cost)}</td>` +
      `<td>${formatCurrency(entry.deductible_amount)}</td>` +
      `<td>${buildActionMenu("meals", entry.id)}</td>` +
    "</tr>"
  ));
  body.innerHTML = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucun repas.", 5);
}

/**
 * Role: Render other expense rows.
 * Inputs: other expense list.
 * Outputs: None.
 * Errors: Throws if table body is missing.
 */
function renderOtherEntries(entries) {
  const table = getElement(OTHER_TABLE_ID);
  const body = table.querySelector("tbody");
  if (!body) {
    throw new Error("Tableau frais introuvable.");
  }
  const rows = entries.map((entry) => (
    "<tr>" +
      `<td>${entry.id}</td>` +
      `<td>${entry.description}</td>` +
      `<td>${formatCurrency(entry.amount)}</td>` +
      `<td>${entry.attachment_path || "-"}</td>` +
      `<td>${buildActionMenu("other", entry.id)}</td>` +
    "</tr>"
  ));
  body.innerHTML = rows.length
    ? rows.join("")
    : buildEmptyRow("Aucun frais.", 5);
}

/**
 * Role: Render the operations tables.
 * Inputs: detail payload.
 * Outputs: None.
 * Errors: None.
 */
function renderOperations(detail) {
  if (!detail) {
    renderMileageEntries([]);
    renderMealEntries([]);
    renderOtherEntries([]);
    return;
  }
  renderMileageEntries(detail.mileage_entries);
  renderMealEntries(detail.meal_expenses);
  renderOtherEntries(detail.other_expenses);
}

/**
 * Role: Close an open row menu.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function closeOpenMenu() {
  if (!state.openMenu) {
    return;
  }
  state.openMenu.classList.remove(MENU_OPEN_CLASS);
  state.openMenu = null;
}

/**
 * Role: Toggle the menu for a row.
 * Inputs: trigger element.
 * Outputs: None.
 * Errors: None.
 */
function toggleMenu(trigger) {
  const menu = trigger.closest(".row-actions");
  if (!menu) {
    return;
  }
  if (state.openMenu && state.openMenu !== menu) {
    closeOpenMenu();
  }
  menu.classList.toggle(MENU_OPEN_CLASS);
  state.openMenu = menu.classList.contains(MENU_OPEN_CLASS)
    ? menu
    : null;
}

/**
 * Role: Select a person from the dropdown.
 * Inputs: event.
 * Outputs: None.
 * Errors: None.
 */
function handlePersonChange(event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  state.selectedPersonId = Number.parseInt(select.value, 10);
  updateMileageVehicleSelect(state.selectedPersonId);
}

/**
 * Role: Read the selected year.
 * Inputs: None.
 * Outputs: year number or null.
 * Errors: None.
 */
function getSelectedYear() {
  const yearInput = getElement(YEAR_INPUT_ID);
  const yearValue = Number.parseInt(yearInput.value, 10);
  if (!Number.isFinite(yearValue)) {
    return null;
  }
  return yearValue;
}

/**
 * Role: Load reference data from the API.
 * Inputs: None.
 * Outputs: None.
 * Errors: Displays errors in status.
 */
async function loadReferences() {
  try {
    setAdminStatus("Chargement des référentiels...");
    const [households, persons, vehicles, mileageScale] = await
      Promise.all([
        getJson(API_ENDPOINTS.households),
        getJson(API_ENDPOINTS.persons),
        getJson(API_ENDPOINTS.vehicles),
        getJson(API_ENDPOINTS.mileageScale),
      ]);
    state.households = households;
    state.persons = persons;
    state.vehicles = vehicles;
    state.mileageScale = mileageScale;
    renderHouseholds(households);
    renderPersons(persons);
    renderVehicles(vehicles);
    renderMileageScale(mileageScale);
    renderPersonSelect(persons);
    if (state.selectedPersonId) {
      updateMileageVehicleSelect(state.selectedPersonId);
      await loadOperations();
    }
    setAdminStatus("Référentiels chargés.");
  } catch (error) {
    setAdminStatus(`Erreur: ${error.message}`);
  }
}

/**
 * Role: Load operations for selected person and year.
 * Inputs: None.
 * Outputs: None.
 * Errors: Displays errors in status.
 */
async function loadOperations() {
  const personId = state.selectedPersonId;
  const year = getSelectedYear();
  state.selectedYear = year || DEFAULT_YEAR;
  if (!personId || !year) {
    setOperationsStatus("Sélectionnez une personne et une année.");
    renderOperations(null);
    return;
  }
  try {
    setOperationsStatus("Chargement des opérations...");
    const detail = await getJson(
      `${API_ENDPOINTS.personDetails}${personId}/details/${year}`
    );
    state.detail = detail;
    renderOperations(detail);
    setOperationsStatus("Opérations chargées.");
  } catch (error) {
    setOperationsStatus(`Erreur: ${error.message}`);
  }
}

/**
 * Role: Build payload for mileage creation.
 * Inputs: table footer row.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildMileageCreatePayload(footer) {
  const vehicleId = parseIntegerField(
    readFieldValue(footer, "vehicle_id"),
    "Véhicule",
    1,
    null
  );
  const month = parseIntegerField(
    readFieldValue(footer, "month"),
    "Mois",
    1,
    12
  );
  const km = parseDecimalField(
    readFieldValue(footer, "km"),
    "Kilomètres",
    0
  );
  return {
    person_id: state.selectedPersonId,
    vehicle_id: vehicleId,
    year: state.selectedYear,
    month,
    km,
  };
}

/**
 * Role: Build payload for meal creation.
 * Inputs: table footer row.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildMealCreatePayload(footer) {
  const month = parseIntegerField(
    readFieldValue(footer, "month"),
    "Mois",
    1,
    12
  );
  const mealCost = parseDecimalField(
    readFieldValue(footer, "meal_cost"),
    "Montant",
    0
  );
  return {
    person_id: state.selectedPersonId,
    year: state.selectedYear,
    month,
    meal_cost: mealCost,
  };
}

/**
 * Role: Build payload for other expense creation.
 * Inputs: table footer row.
 * Outputs: Payload object.
 * Errors: Throws on invalid input.
 */
function buildOtherCreatePayload(footer) {
  const description = readFieldValue(footer, "description");
  if (!description) {
    throw new Error("Description requise.");
  }
  const amount = parseDecimalField(
    readFieldValue(footer, "amount"),
    "Montant",
    0
  );
  const attachment = readFieldValue(footer, "attachment_path");
  return {
    person_id: state.selectedPersonId,
    year: state.selectedYear,
    description,
    amount,
    attachment_path: attachment || null,
  };
}

/**
 * Role: Reset inputs in the given footer row.
 * Inputs: table footer row.
 * Outputs: None.
 * Errors: None.
 */
function resetFooterInputs(footer) {
  const fields = footer.querySelectorAll("input");
  fields.forEach((field) => {
    field.value = "";
  });
}

/**
 * Role: Add a new entry based on the table type.
 * Inputs: entry type and footer row.
 * Outputs: None.
 * Errors: Displays errors in status.
 */
async function addEntry(entryType, footer) {
  try {
    if (!state.selectedPersonId) {
      setOperationsStatus("Sélectionnez une personne.");
      return;
    }
    const year = getSelectedYear();
    if (!year) {
      setOperationsStatus("Année invalide.");
      return;
    }
    state.selectedYear = year;
    let payload = null;
    let endpoint = "";
    if (entryType === "mileage") {
      payload = buildMileageCreatePayload(footer);
      endpoint = API_ENDPOINTS.mileage;
    }
    if (entryType === "meals") {
      payload = buildMealCreatePayload(footer);
      endpoint = API_ENDPOINTS.meals;
    }
    if (entryType === "other") {
      payload = buildOtherCreatePayload(footer);
      endpoint = API_ENDPOINTS.otherExpenses;
    }
    if (!payload) {
      return;
    }
    await sendJson(endpoint, "POST", payload);
    resetFooterInputs(footer);
    await loadOperations();
    setOperationsStatus("Entrée ajoutée.");
  } catch (error) {
    setOperationsStatus(`Erreur: ${error.message}`);
  }
}

/**
 * Role: Get an entry by type and id.
 * Inputs: entry type and entry id.
 * Outputs: Entry object or null.
 * Errors: None.
 */
function findEntry(entryType, entryId) {
  if (!state.detail) {
    return null;
  }
  if (entryType === "mileage") {
    return state.detail.mileage_entries.find(
      (entry) => entry.id === entryId
    );
  }
  if (entryType === "meals") {
    return state.detail.meal_expenses.find(
      (entry) => entry.id === entryId
    );
  }
  if (entryType === "other") {
    return state.detail.other_expenses.find(
      (entry) => entry.id === entryId
    );
  }
  return null;
}

/**
 * Role: Populate the mileage edit dialog.
 * Inputs: entry object.
 * Outputs: None.
 * Errors: None.
 */
function populateMileageEdit(entry) {
  const form = getElement(MILEAGE_EDIT_FORM_ID);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Formulaire invalide.");
  }
  const vehicleSelect = form.elements.namedItem("vehicle_id");
  if (!(vehicleSelect instanceof HTMLSelectElement)) {
    throw new Error("Sélecteur véhicule invalide.");
  }
  renderVehicleOptions(vehicleSelect, state.selectedPersonId);
  form.elements.namedItem("id").value = String(entry.id);
  vehicleSelect.value = String(entry.vehicle_id);
  form.elements.namedItem("year").value = String(entry.year);
  form.elements.namedItem("month").value = String(entry.month);
  form.elements.namedItem("km").value = String(entry.km);
}

/**
 * Role: Populate the meal edit dialog.
 * Inputs: entry object.
 * Outputs: None.
 * Errors: None.
 */
function populateMealEdit(entry) {
  const form = getElement(MEAL_EDIT_FORM_ID);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Formulaire invalide.");
  }
  form.elements.namedItem("id").value = String(entry.id);
  form.elements.namedItem("year").value = String(entry.year);
  form.elements.namedItem("month").value = String(entry.month);
  form.elements.namedItem("meal_cost").value = String(entry.meal_cost);
}

/**
 * Role: Populate the other expense edit dialog.
 * Inputs: entry object.
 * Outputs: None.
 * Errors: None.
 */
function populateOtherEdit(entry) {
  const form = getElement(OTHER_EDIT_FORM_ID);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Formulaire invalide.");
  }
  form.elements.namedItem("id").value = String(entry.id);
  form.elements.namedItem("year").value = String(entry.year);
  form.elements.namedItem("description").value = entry.description;
  form.elements.namedItem("amount").value = String(entry.amount);
  form.elements.namedItem("attachment_path").value =
    entry.attachment_path || "";
}

/**
 * Role: Populate delete dialog hidden field.
 * Inputs: form id and entry id.
 * Outputs: None.
 * Errors: None.
 */
function populateDeleteForm(formId, entryId) {
  const form = getElement(formId);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Formulaire invalide.");
  }
  form.elements.namedItem("id").value = String(entryId);
}

/**
 * Role: Handle row menu actions.
 * Inputs: action and entry identifiers.
 * Outputs: None.
 * Errors: None.
 */
function handleMenuAction(action, entryType, entryId) {
  const entry = findEntry(entryType, entryId);
  if (!entry) {
    return;
  }
  if (action === "edit") {
    if (entryType === "mileage") {
      populateMileageEdit(entry);
      openDialog("mileage-edit-dialog");
    }
    if (entryType === "meals") {
      populateMealEdit(entry);
      openDialog("meal-edit-dialog");
    }
    if (entryType === "other") {
      populateOtherEdit(entry);
      openDialog("other-edit-dialog");
    }
  }
  if (action === "delete") {
    if (entryType === "mileage") {
      populateDeleteForm(MILEAGE_DELETE_FORM_ID, entryId);
      openDialog("mileage-delete-dialog");
    }
    if (entryType === "meals") {
      populateDeleteForm(MEAL_DELETE_FORM_ID, entryId);
      openDialog("meal-delete-dialog");
    }
    if (entryType === "other") {
      populateDeleteForm(OTHER_DELETE_FORM_ID, entryId);
      openDialog("other-delete-dialog");
    }
  }
}

/**
 * Role: Build payload for mileage update.
 * Inputs: form element.
 * Outputs: Object with id and payload.
 * Errors: Throws on invalid input.
 */
function buildMileageUpdatePayload(form) {
  const id = parseIntegerField(
    form.elements.namedItem("id").value,
    "ID",
    1,
    null
  );
  const vehicleId = parseIntegerField(
    form.elements.namedItem("vehicle_id").value,
    "Véhicule",
    1,
    null
  );
  const year = parseIntegerField(
    form.elements.namedItem("year").value,
    "Année",
    2000,
    2100
  );
  const month = parseIntegerField(
    form.elements.namedItem("month").value,
    "Mois",
    1,
    12
  );
  const km = parseDecimalField(
    form.elements.namedItem("km").value,
    "Kilomètres",
    0
  );
  return {
    id,
    payload: {
      person_id: state.selectedPersonId,
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
    form.elements.namedItem("id").value,
    "ID",
    1,
    null
  );
  const year = parseIntegerField(
    form.elements.namedItem("year").value,
    "Année",
    2000,
    2100
  );
  const month = parseIntegerField(
    form.elements.namedItem("month").value,
    "Mois",
    1,
    12
  );
  const mealCost = parseDecimalField(
    form.elements.namedItem("meal_cost").value,
    "Montant",
    0
  );
  return {
    id,
    payload: {
      person_id: state.selectedPersonId,
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
    form.elements.namedItem("id").value,
    "ID",
    1,
    null
  );
  const year = parseIntegerField(
    form.elements.namedItem("year").value,
    "Année",
    2000,
    2100
  );
  const description = form.elements.namedItem("description").value.trim();
  if (!description) {
    throw new Error("Description requise.");
  }
  const amount = parseDecimalField(
    form.elements.namedItem("amount").value,
    "Montant",
    0
  );
  const attachment = form.elements.namedItem("attachment_path").value.trim();
  return {
    id,
    payload: {
      person_id: state.selectedPersonId,
      year,
      description,
      amount,
      attachment_path: attachment || null,
    },
  };
}

/**
 * Role: Submit an update request.
 * Inputs: endpoint, id, and payload.
 * Outputs: None.
 * Errors: Displays errors in status.
 */
async function submitUpdate(endpoint, id, payload) {
  try {
    await sendJson(`${endpoint}/${id}`, "PUT", payload);
    await loadOperations();
    setOperationsStatus("Entrée mise à jour.");
  } catch (error) {
    setOperationsStatus(`Erreur: ${error.message}`);
  }
}

/**
 * Role: Submit a delete request.
 * Inputs: endpoint and id.
 * Outputs: None.
 * Errors: Displays errors in status.
 */
async function submitDelete(endpoint, id) {
  try {
    await sendJson(`${endpoint}/${id}`, "DELETE", null);
    await loadOperations();
    setOperationsStatus("Entrée supprimée.");
  } catch (error) {
    setOperationsStatus(`Erreur: ${error.message}`);
  }
}

/**
 * Role: Initialize dialog close handlers.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function initDialogCloseHandlers() {
  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog && dialog.open) {
        dialog.close();
      }
    });
  });
}

/**
 * Role: Initialize UI event listeners.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function initEventListeners() {
  getElement(ADMIN_REFRESH_ID).addEventListener("click", loadReferences);
  getElement(OPERATIONS_REFRESH_ID).addEventListener("click", loadOperations);
  getElement(PERSON_SELECT_ID).addEventListener(
    "change",
    handlePersonChange
  );
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const menuButton = target.closest("[data-action='menu']");
    if (menuButton) {
      event.stopPropagation();
      toggleMenu(menuButton);
      return;
    }
    const actionSelector = \"[data-action='edit'], [data-action='delete']\";
    const actionButton = target.closest(actionSelector);
    if (actionButton) {
      const entryType = actionButton.dataset.entryType;
      const entryId = Number.parseInt(actionButton.dataset.entryId, 10);
      const action = actionButton.dataset.action;
      closeOpenMenu();
      if (entryType && Number.isFinite(entryId)) {
        handleMenuAction(action, entryType, entryId);
      }
      return;
    }
    closeOpenMenu();
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const addButton = target.closest("[data-add-entry]");
    if (!addButton) {
      return;
    }
    const entryType = addButton.dataset.addEntry;
    const table = addButton.closest("table");
    const footer = table ? table.querySelector("tfoot") : null;
    if (entryType && footer) {
      addEntry(entryType, footer);
    }
  });
  getElement(MILEAGE_EDIT_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const data = buildMileageUpdatePayload(form);
      submitUpdate(API_ENDPOINTS.mileage, data.id, data.payload);
      closeDialogForForm(form);
    }
  );
  getElement(MEAL_EDIT_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const data = buildMealUpdatePayload(form);
      submitUpdate(API_ENDPOINTS.meals, data.id, data.payload);
      closeDialogForForm(form);
    }
  );
  getElement(OTHER_EDIT_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const data = buildOtherUpdatePayload(form);
      submitUpdate(API_ENDPOINTS.otherExpenses, data.id, data.payload);
      closeDialogForForm(form);
    }
  );
  getElement(MILEAGE_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const id = Number.parseInt(
        form.elements.namedItem("id").value,
        10
      );
      if (!Number.isFinite(id)) {
        return;
      }
      submitDelete(API_ENDPOINTS.mileage, id);
      closeDialogForForm(form);
    }
  );
  getElement(MEAL_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const id = Number.parseInt(
        form.elements.namedItem("id").value,
        10
      );
      if (!Number.isFinite(id)) {
        return;
      }
      submitDelete(API_ENDPOINTS.meals, id);
      closeDialogForForm(form);
    }
  );
  getElement(OTHER_DELETE_FORM_ID).addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      const id = Number.parseInt(
        form.elements.namedItem("id").value,
        10
      );
      if (!Number.isFinite(id)) {
        return;
      }
      submitDelete(API_ENDPOINTS.otherExpenses, id);
      closeDialogForForm(form);
    }
  );
}

/**
 * Role: Initialize the admin page.
 * Inputs: None.
 * Outputs: None.
 * Errors: None.
 */
function initAdminPage() {
  getElement(YEAR_INPUT_ID).value = String(DEFAULT_YEAR);
  initDialogCloseHandlers();
  initEventListeners();
  loadReferences();
}

initAdminPage();
