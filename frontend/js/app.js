"use strict";

/*
=========================================================
 LOGINSHIELD
 Frontend Application Controller
=========================================================

Connects the UI to the FastAPI backend.

Backend endpoints used:

POST /auth/request-otp
POST /auth/verify-otp

GET  /dashboard/summary
GET  /dashboard/risk-distribution
GET  /dashboard/recent

GET  /events/
GET  /events/alerts
GET  /events/locations

POST /simulate/normal
POST /simulate/brute-force
POST /simulate/suspicious-success
=========================================================
*/


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "";

const REFRESH_INTERVAL = 5000;

let riskChart = null;

let allEvents = [];

let currentInvestigationEvent = null;

let currentUser = {
    phone: null,
    email: null
};
let pendingAuth = {
    phone: null,
    email: null
};

let authCompleted = false;

/* =========================================================
   DOM HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   API HELPER
========================================================= */

async function apiFetch(endpoint, options = {}) {

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        const message =
            data?.detail ||
            data?.message ||
            `Request failed (${response.status})`;

        throw new Error(message);
    }

    return data;
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeNavigation();

    initializeMobileMenu();

    initializeRefreshButton();

    initializeFilters();

    loadDashboard();

    /*
        Automatic refresh.

        This gives the dashboard a real-time feel
        without requiring WebSockets yet.
    */

    setInterval(() => {

        const activePage =
            document.querySelector(".page.active");

        if (!activePage) {
            return;
        }

        const pageId = activePage.id;

        if (pageId === "page-dashboard") {
            loadDashboard();
        }

        if (pageId === "page-events") {
            loadEvents();
        }

        if (pageId === "page-alerts") {
            loadAlerts();
        }

        if (pageId === "page-locations") {
            loadLocations();
        }

    }, REFRESH_INTERVAL);

});


/* =========================================================
   NAVIGATION
========================================================= */

const pageInformation = {

    dashboard: {
        title: "Dashboard",
        description:
            "Real-time authentication threat monitoring"
    },

    events: {
        title: "Login Events",
        description:
            "Complete authentication activity"
    },

    alerts: {
        title: "Alert Center",
        description:
            "Suspicious activity requiring investigation"
    },

    locations: {
        title: "Location Intelligence",
        description:
            "Geographic authentication intelligence"
    },

    profile: {
        title: "Security Profile",
        description:
            "Behavioral authentication baseline"
    },

    investigation: {
        title: "Investigation",
        description:
            "Analyze suspicious authentication activity"
    },

    simulation: {
        title: "Simulation Lab",
        description:
            "Safely test LoginShield detection"
    }

};


function initializeNavigation() {

    document.querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener("click", () => {

                const page =
                    button.dataset.page;

                navigateTo(page);

            });

        });

}


function navigateTo(pageName) {

    /*
        Update navigation state.
    */

    document.querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );

        });


    /*
        Hide every page.
    */

    document.querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });


    /*
        Show selected page.
    */

    const selectedPage =
        $(`page-${pageName}`);

    if (!selectedPage) {
        return;
    }

    selectedPage.classList.add("active");


    /*
        Update topbar.
    */

    const info =
        pageInformation[pageName];

    if (info) {

        $("pageTitle").textContent =
            info.title;

        $("pageDescription").textContent =
            info.description;

    }


    /*
        Load page-specific data.
    */

    if (pageName === "dashboard") {
        loadDashboard();
    }

    if (pageName === "events") {
        loadEvents();
    }

    if (pageName === "alerts") {
        loadAlerts();
    }

    if (pageName === "locations") {
        loadLocations();
    }

    if (pageName === "profile") {
        loadSecurityProfile();
    }


    /*
        Close mobile sidebar.
    */

    document.querySelector(".sidebar")
        ?.classList.remove("mobile-open");

}


/* =========================================================
   MOBILE MENU
========================================================= */

function initializeMobileMenu() {

    $("mobileMenu")
        ?.addEventListener("click", () => {

            document.querySelector(".sidebar")
                ?.classList.toggle("mobile-open");

        });

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeRefreshButton() {

    $("refreshButton")
        ?.addEventListener("click", async () => {

            const activePage =
                document.querySelector(".page.active");

            if (!activePage) {
                return;
            }

            const page =
                activePage.id.replace("page-", "");

            await refreshPage(page);

            showToast(
                "Dashboard refreshed",
                "Latest security data has been loaded.",
                "success"
            );

        });

}


async function refreshPage(page) {

    if (page === "dashboard") {
        await loadDashboard();
    }

    if (page === "events") {
        await loadEvents();
    }

    if (page === "alerts") {
        await loadAlerts();
    }

    if (page === "locations") {
        await loadLocations();
    }

    if (page === "profile") {
        await loadSecurityProfile();
    }

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const [
            summary,
            distribution,
            recent
        ] = await Promise.all([

            apiFetch("/dashboard/summary"),

            apiFetch("/dashboard/risk-distribution"),

            apiFetch("/dashboard/recent")

        ]);


        updateSummary(summary);

        updateRiskChart(distribution);

        updateRecentEvents(recent);

        updateLastUpdated();

        updateAlertBadge(summary);

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showToast(
            "Dashboard connection error",
            error.message,
            "error"
        );

    }

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary(data) {

    /*
        Support several possible backend naming styles.

        This makes the frontend tolerant of small
        differences in the backend response.
    */

    const total =
        data?.total_attempts ??
        data?.total ??
        data?.attempts ??
        0;

    const successful =
        data?.successful_logins ??
        data?.successful ??
        data?.successes ??
        0;

    const failed =
        data?.failed_logins ??
        data?.failed ??
        data?.failures ??
        0;

    const highRisk =
        data?.high_risk_events ??
        data?.high_risk ??
        0;

    const critical =
        data?.critical_events ??
        data?.critical ??
        0;

    const averageRisk =
        data?.average_risk ??
        data?.average_risk_score ??
        0;


    setText(
        "totalAttempts",
        formatNumber(total)
    );

    setText(
        "successfulLogins",
        formatNumber(successful)
    );

    setText(
        "failedLogins",
        formatNumber(failed)
    );

    setText(
        "highRiskEvents",
        formatNumber(highRisk)
    );

    setText(
        "criticalEvents",
        formatNumber(critical)
    );


    const roundedRisk =
        Math.round(Number(averageRisk) || 0);

    setText(
        "averageRisk",
        roundedRisk
    );


    /*
        Success rate.
    */

    const successRate =
        total > 0
            ? Math.round((successful / total) * 100)
            : 0;

    setText(
        "successRate",
        `${successRate}%`
    );


    /*
        Average risk meter.
    */

    const riskBar =
        $("averageRiskBar");

    if (riskBar) {

        riskBar.style.width =
            `${Math.min(100, roundedRisk)}%`;

    }


    /*
        Security posture.

        Higher security score = lower average risk.
    */

    const securityScore =
        Math.max(
            0,
            Math.min(
                100,
                100 - roundedRisk
            )
        );

    setText(
        "securityScore",
        securityScore
    );


    updateSecurityPosture(
        securityScore
    );

}


function updateSecurityPosture(score) {

    const status =
        $("securityStatus");

    const ring =
        document.querySelector(".score-ring");

    if (!status || !ring) {
        return;
    }


    if (score >= 80) {

        status.textContent =
            "Strong Security Posture";

        ring.style.background =
            `conic-gradient(
                var(--green) ${score * 3.6}deg,
                rgba(255,255,255,0.06) 0deg
            )`;

    }

    else if (score >= 60) {

        status.textContent =
            "Moderate Security Risk";

        ring.style.background =
            `conic-gradient(
                var(--orange) ${score * 3.6}deg,
                rgba(255,255,255,0.06) 0deg
            )`;

    }

    else {

        status.textContent =
            "Elevated Security Risk";

        ring.style.background =
            `conic-gradient(
                var(--red) ${score * 3.6}deg,
                rgba(255,255,255,0.06) 0deg
            )`;

    }

}


/* =========================================================
   RISK CHART
========================================================= */

function updateRiskChart(data) {

    const canvas =
        $("riskChart");

    if (!canvas) {
        return;
    }


    const distribution =
        normalizeRiskDistribution(data);


    if (typeof Chart === "undefined") {

        console.warn(
            "Chart.js has not loaded."
        );

        return;
    }


    if (riskChart) {

        riskChart.destroy();

    }


    riskChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Low",
                        "Medium",
                        "High",
                        "Critical"
                    ],

                    datasets: [

                        {

                            data: [

                                distribution.low,

                                distribution.medium,

                                distribution.high,

                                distribution.critical

                            ],

                            backgroundColor: [

                                "#39d98a",

                                "#ffb454",

                                "#ff8b61",

                                "#ff5c68"

                            ],

                            borderColor: "#0d141f",

                            borderWidth: 4,

                            hoverOffset: 5

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "70%",

                    plugins: {

                        legend: {

                            position: "right",

                            labels: {

                                color: "#8b97a7",

                                padding: 16,

                                boxWidth: 8,

                                boxHeight: 8,

                                font: {
                                    size: 10
                                }

                            }

                        },

                        tooltip: {

                            backgroundColor:
                                "#101925",

                            borderColor:
                                "rgba(255,255,255,0.1)",

                            borderWidth: 1,

                            titleColor: "#ffffff",

                            bodyColor: "#9ca8b8"

                        }

                    }

                }

            }
        );

}


function normalizeRiskDistribution(data) {

    /*
        Handle dictionary response.
    */

    if (!data) {

        return {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

    }


    if (Array.isArray(data)) {

        const result = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };


        data.forEach(item => {

            const level =
                String(
                    item.risk_level ||
                    item.level ||
                    ""
                ).toLowerCase();

            const count =
                Number(
                    item.count ||
                    item.total ||
                    0
                );

            if (level.includes("low")) {
                result.low += count;
            }

            else if (level.includes("medium")) {
                result.medium += count;
            }

            else if (level.includes("high")) {
                result.high += count;
            }

            else if (level.includes("critical")) {
                result.critical += count;
            }

        });

        return result;
    }


    return {

        low:
            Number(
                data.low ??
                data.LOW ??
                0
            ),

        medium:
            Number(
                data.medium ??
                data.MEDIUM ??
                0
            ),

        high:
            Number(
                data.high ??
                data.HIGH ??
                0
            ),

        critical:
            Number(
                data.critical ??
                data.CRITICAL ??
                0
            )

    };

}


/* =========================================================
   RECENT EVENTS
========================================================= */

async function updateRecentEvents(data) {

    let events =
        extractEvents(data);

    allEvents =
        events;


    const tbody =
        $("recentEventsTable");

    if (!tbody) {
        return;
    }


    if (!events.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    No authentication events recorded yet.
                </td>
            </tr>
        `;

        return;
    }


    events =
        events.slice(0, 8);


    tbody.innerHTML =
        events.map(event =>
            createRecentEventRow(event)
        ).join("");

}


function createRecentEventRow(event) {

    const id =
        event.id ?? "";

    const phone =
        event.phone ??
        "Unknown";

    const location =
        formatLocation(event);

    const device =
        event.device ??
        "Unknown";

    const status =
        normalizeStatus(event.status);

    const riskLevel =
        normalizeRiskLevel(
            event.risk_level,
            event.risk_score
        );

    const riskScore =
        Number(
            event.risk_score ?? 0
        );


    return `

        <tr>

            <td>
                ${formatTimestamp(event.timestamp)}
            </td>

            <td>

                <div class="identity-cell">

                    <div class="identity-avatar">
                        ${escapeHTML(
                            String(phone).slice(-2)
                        )}
                    </div>

                    <div class="identity-details">

                        <strong>
                            ${escapeHTML(phone)}
                        </strong>

                        <small>
                            Authentication attempt
                        </small>

                    </div>

                </div>

            </td>

            <td>
                ${escapeHTML(location)}
            </td>

            <td>
                ${escapeHTML(device)}
            </td>

            <td>
                <span class="status-badge ${status === "success"
                    ? "status-success"
                    : "status-failed"}">

                    ${escapeHTML(status)}

                </span>
            </td>

            <td>

                <span class="risk-badge ${riskClass(riskLevel)}">

                    ${escapeHTML(riskLevel)}

                </span>

                <span class="score-number">
                    ${riskScore}
                </span>

            </td>

            <td>

                <button
                    class="text-button"
                    onclick="openInvestigation(${id})"
                >
                    Investigate →
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   EVENTS PAGE
========================================================= */

async function loadEvents() {

    const tbody =
        $("eventsTable");

    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    Loading authentication events...
                </td>
            </tr>
        `;

    }


    try {

        const data =
            await apiFetch("/events/");

        allEvents =
            extractEvents(data);

        renderEventsTable();

    } catch (error) {

        console.error(error);

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        Failed to load events.
                    </td>
                </tr>
            `;

        }

    }

}


function renderEventsTable() {

    const tbody =
        $("eventsTable");

    if (!tbody) {
        return;
    }


    let events =
        [...allEvents];


    const search =
        (
            $("eventSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const riskFilter =
        $("riskFilter")?.value ||
        "all";


    const statusFilter =
        $("statusFilter")?.value ||
        "all";


    events =
        events.filter(event => {

            const searchable = [

                event.phone,

                event.ip_address,

                event.country,

                event.region,

                event.city,

                event.device,

                event.browser,

                event.operating_system

            ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


            const level =
                normalizeRiskLevel(
                    event.risk_level,
                    event.risk_score
                )
                .toLowerCase();


            const status =
                normalizeStatus(
                    event.status
                );


            const matchesSearch =
                !search ||
                searchable.includes(search);


            const matchesRisk =
                riskFilter === "all" ||
                level === riskFilter;


            const matchesStatus =
                statusFilter === "all" ||
                status === statusFilter;


            return (
                matchesSearch &&
                matchesRisk &&
                matchesStatus
            );

        });


    if (!events.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    No events match the current filters.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        events.map(event =>
            createEventRow(event)
        ).join("");

}


function createEventRow(event) {

    const id =
        event.id ?? "";


    const phone =
        event.phone ??
        "Unknown";


    const status =
        normalizeStatus(
            event.status
        );


    const riskLevel =
        normalizeRiskLevel(
            event.risk_level,
            event.risk_score
        );


    const riskScore =
        Number(
            event.risk_score ?? 0
        );


    return `

        <tr>

            <td>
                ${formatTimestamp(event.timestamp)}
            </td>

            <td>
                ${escapeHTML(phone)}
            </td>

            <td>
                <span class="mono">
                    ${escapeHTML(
                        event.ip_address ||
                        "Unknown"
                    )}
                </span>
            </td>

            <td>
                ${escapeHTML(
                    formatLocation(event)
                )}
            </td>

            <td>
                ${escapeHTML(
                    event.device ||
                    "Unknown"
                )}
            </td>

            <td>

                <span class="status-badge ${
                    status === "success"
                        ? "status-success"
                        : "status-failed"
                }">

                    ${escapeHTML(status)}

                </span>

            </td>

            <td>

                <span class="risk-badge ${
                    riskClass(riskLevel)
                }">

                    ${escapeHTML(riskLevel)}

                </span>

                <span class="score-number">
                    ${riskScore}
                </span>

            </td>

            <td>

                <button
                    class="text-button"
                    onclick="openInvestigation(${id})"
                >
                    View →
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   FILTERS
========================================================= */

function initializeFilters() {

    $("eventSearch")
        ?.addEventListener(
            "input",
            renderEventsTable
        );


    $("riskFilter")
        ?.addEventListener(
            "change",
            renderEventsTable
        );


    $("statusFilter")
        ?.addEventListener(
            "change",
            renderEventsTable
        );

}


/* =========================================================
   ALERT CENTER
========================================================= */

async function loadAlerts() {

    const container =
        $("alertsContainer");

    if (!container) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/events/alerts"
            );


        const alerts =
            extractEvents(data);


        $("alertCountLarge").textContent =
            alerts.length;


        $("alertBadge").textContent =
            alerts.length;


        if (!alerts.length) {

            container.innerHTML = `

                <div class="empty-state">

                    No high-risk authentication
                    events detected.

                </div>

            `;

            return;
        }


        container.innerHTML =
            alerts.map(alert =>
                createAlertCard(alert)
            ).join("");


    } catch (error) {

        console.error(
            "Alert loading error:",
            error
        );

        container.innerHTML = `

            <div class="empty-state">

                Unable to load security alerts.

            </div>

        `;

    }

}


function createAlertCard(event) {

    const id =
        event.id ?? "";


    const riskLevel =
        normalizeRiskLevel(
            event.risk_level,
            event.risk_score
        );


    const score =
        Number(
            event.risk_score ?? 0
        );


    const reasons =
        parseReasons(
            event.detection_reasons
        );


    const primaryReason =
        reasons.length
            ? reasons[0]
            : "Suspicious authentication behavior detected";


    return `

        <div class="alert-card">

            <div class="alert-icon">
                ⚠
            </div>

            <div class="alert-body">

                <div class="alert-title">

                    ${escapeHTML(
                        riskLevel
                    )}

                    authentication threat

                </div>

                <div class="alert-description">

                    ${escapeHTML(
                        primaryReason
                    )}

                </div>

                <div class="alert-meta">

                    <span>
                        ${escapeHTML(
                            formatTimestamp(
                                event.timestamp
                            )
                        )}
                    </span>

                    <span>•</span>

                    <span>
                        ${escapeHTML(
                            event.ip_address ||
                            "Unknown IP"
                        )}
                    </span>

                    <span>•</span>

                    <span>
                        ${escapeHTML(
                            formatLocation(event)
                        )}
                    </span>

                    <span>•</span>

                    <span>
                        Risk ${score}/100
                    </span>

                </div>

            </div>

            <button
                class="alert-action"
                onclick="openInvestigation(${id})"
            >
                Investigate
            </button>

        </div>

    `;

}


function updateAlertBadge(summary) {

    const highRisk =
        summary?.high_risk_events ??
        summary?.high_risk ??
        summary?.critical_events ??
        0;


    const badge =
        $("alertBadge");

    if (badge) {

        badge.textContent =
            Number(highRisk);

    }

}


/* =========================================================
   LOCATION INTELLIGENCE
========================================================= */

async function loadLocations() {

    const list =
        $("locationsList");

    if (!list) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/events/locations"
            );


        const locations =
            Array.isArray(data)
                ? data
                : (
                    data?.locations ||
                    []
                );


        if (!locations.length) {

            list.innerHTML = `

                <div class="empty-state">
                    No location data available.
                </div>

            `;

            return;
        }


        list.innerHTML =
            locations.map(
                createLocationItem
            ).join("");


        renderMapMarkers(locations);


    } catch (error) {

        console.error(
            "Location loading error:",
            error
        );

        list.innerHTML = `

            <div class="empty-state">
                Unable to load locations.
            </div>

        `;

    }

}


function createLocationItem(location) {

    const city =
        location.city ||
        "Unknown City";


    const region =
        location.region ||
        "";


    const country =
        location.country ||
        "";


    const attempts =
        Number(
            location.attempts ||
            location.count ||
            0
        );


    const risk =
        Number(
            location.highest_risk ||
            location.max_risk ||
            location.risk_score ||
            0
        );


    return `

        <div class="location-item">

            <div class="location-icon">
                ◎
            </div>

            <div class="location-info">

                <strong>
                    ${escapeHTML(city)}
                </strong>

                <small>
                    ${escapeHTML(
                        [region, country]
                            .filter(Boolean)
                            .join(", ")
                    )}
                </small>

            </div>

            <div class="location-risk">

                <strong>
                    ${attempts}
                </strong>

                <small>
                    attempts
                </small>

            </div>

            <div class="location-risk">

                <strong>
                    ${risk}
                </strong>

                <small>
                    max risk
                </small>

            </div>

        </div>

    `;

}


/*
    The MVP uses a lightweight visual map.

    Once the product is deployed, this can be replaced
    with a proper interactive geographic map.
*/

function renderMapMarkers(locations) {

    const map =
        $("securityMap");

    if (!map) {
        return;
    }


    /*
        Remove previous markers.
    */

    map.querySelectorAll(".map-marker")
        .forEach(marker =>
            marker.remove()
        );


    locations
        .slice(0, 15)
        .forEach((location, index) => {

            const marker =
                document.createElement("div");

            marker.className =
                "map-marker";


            /*
                Deterministic visual placement
                for MVP demonstration.
            */

            const x =
                25 +
                ((index * 37) % 55);

            const y =
                22 +
                ((index * 29) % 55);


            marker.style.left =
                `${x}%`;

            marker.style.top =
                `${y}%`;


            marker.title =
                `${location.city || "Unknown"} — ${
                    location.attempts || 0
                } attempts`;


            map.appendChild(marker);

        });

}


/* =========================================================
   SECURITY PROFILE
========================================================= */

async function loadSecurityProfile() {

    try {

        const data =
            await apiFetch(
                "/events/"
            );


        const events =
            extractEvents(data);


        if (!events.length) {

            updateProfileValues(
                0,
                0,
                0,
                "—"
            );

            return;
        }


        const ips =
            new Set(
                events
                    .map(event =>
                        event.ip_address
                    )
                    .filter(Boolean)
            );


        const devices =
            new Set(
                events
                    .map(event =>
                        event.device
                    )
                    .filter(Boolean)
            );


        const locations =
            new Set(
                events
                    .map(event =>
                        formatLocation(event)
                    )
                    .filter(Boolean)
            );


        const hours =
            events
                .map(event => {

                    if (!event.timestamp) {
                        return null;
                    }

                    const date =
                        new Date(
                            event.timestamp
                        );

                    return date.getHours();

                })
                .filter(hour =>
                    hour !== null
                );


        let loginHours = "—";


        if (hours.length) {

            const min =
                Math.min(...hours);

            const max =
                Math.max(...hours);

            loginHours =
                `${min}:00 – ${max}:00`;

        }


        updateProfileValues(

            ips.size,

            devices.size,

            locations.size,

            loginHours

        );


        if (currentUser.phone) {

            setText(
                "profilePhone",
                currentUser.phone
            );

        }

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }

}


function updateProfileValues(
    ips,
    devices,
    locations,
    hours
) {

    setText(
        "knownIps",
        ips
    );

    setText(
        "knownDevices",
        devices
    );

    setText(
        "knownLocations",
        locations
    );

    setText(
        "loginHours",
        hours
    );

}


/* =========================================================
   INVESTIGATION
========================================================= */

function openInvestigation(eventId) {

    let event =
        allEvents.find(
            item =>
                String(item.id) ===
                String(eventId)
        );


    /*
        If event isn't in the current list,
        fetch all events again.
    */

    if (!event) {

        apiFetch("/events/")
            .then(data => {

                const events =
                    extractEvents(data);

                allEvents =
                    events;

                event =
                    events.find(
                        item =>
                            String(item.id) ===
                            String(eventId)
                    );


                if (event) {

                    displayInvestigation(
                        event
                    );

                } else {

                    showToast(
                        "Event not found",
                        "The selected event could not be loaded.",
                        "error"
                    );

                }

            })
            .catch(error => {

                showToast(
                    "Investigation failed",
                    error.message,
                    "error"
                );

            });

        return;
    }


    displayInvestigation(event);

}


function displayInvestigation(event) {

    currentInvestigationEvent =
        event;


    const empty =
        $("investigationEmpty");

    const content =
        $("investigationContent");


    if (!empty || !content) {
        return;
    }


    empty.classList.add("hidden");

    content.classList.remove("hidden");


    /*
        Update header.
    */

    setText(
        "investigationTitle",
        `${event.phone || "Unknown User"} Authentication Event`
    );


    setText(
        "investigationTimestamp",
        formatTimestamp(
            event.timestamp
        )
    );


    /*
        Risk badge.
    */

    const riskContainer =
        $("investigationRisk");


    const riskLevel =
        normalizeRiskLevel(
            event.risk_level,
            event.risk_score
        );


    const riskScore =
        Number(
            event.risk_score || 0
        );


    if (riskContainer) {

        riskContainer.innerHTML = `

            <span class="risk-badge ${riskClass(riskLevel)}">

                ${escapeHTML(
                    riskLevel
                )}

            </span>

            <strong class="score-number">

                ${riskScore}/100

            </strong>

        `;

    }


    /*
        Detection reasons.
    */

    const reasonsContainer =
        $("investigationReasons");


    const reasons =
        parseReasons(
            event.detection_reasons
        );


    if (reasonsContainer) {

        if (!reasons.length) {

            reasonsContainer.innerHTML = `

                <div class="empty-state">
                    No specific detection reasons recorded.
                </div>

            `;

        } else {

            reasonsContainer.innerHTML =
                reasons.map(
                    reason => `

                        <div class="reason-item">

                            <div class="reason-indicator">
                                ⚠
                            </div>

                            <div>

                                <strong>
                                    Security Signal
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        reason
                                    )}
                                </p>

                            </div>

                        </div>

                    `
                ).join("");

        }

    }


    /*
        Metadata.
    */

    const metadata =
        $("investigationMetadata");


    if (metadata) {

        metadata.innerHTML = [

            [
                "IP Address",
                event.ip_address || "Unknown"
            ],

            [
                "Location",
                formatLocation(event)
            ],

            [
                "Device",
                event.device || "Unknown"
            ],

            [
                "Browser",
                event.browser || "Unknown"
            ],

            [
                "Operating System",
                event.operating_system || "Unknown"
            ],

            [
                "Authentication",
                normalizeStatus(event.status)
            ],

            [
                "Risk Score",
                `${riskScore}/100`
            ],

            [
                "User Agent",
                event.user_agent || "Unknown"
            ]

        ]
        .map(
            ([label, value]) => `

                <div class="metadata-item">

                    <span>
                        ${escapeHTML(label)}
                    </span>

                    <strong title="${escapeHTML(value)}">
                        ${escapeHTML(value)}
                    </strong>

                </div>

            `
        )
        .join("");

    }


    /*
        Navigate to investigation page.
    */

    navigateTo("investigation");

}


/* =========================================================
   SIMULATION LAB
========================================================= */

async function runSimulation(type) {

    let endpoint;

    let label;


    if (type === "normal") {

        endpoint =
            "/simulate/normal";

        label =
            "Normal Login";

    }

    else if (type === "brute-force") {

        endpoint =
            "/simulate/brute-force";

        label =
            "Brute Force Attack";

    }

    else if (type === "suspicious-success") {

        endpoint =
            "/simulate/suspicious-success";

        label =
            "Suspicious Success";

    }

    else {

        return;

    }


    writeConsole(
        `[SIMULATION] Starting ${label}...`
    );


    try {

        const result =
            await apiFetch(
                endpoint,
                {
                    method: "POST"
                }
            );


        writeConsole(
            `[ENGINE] ${label} completed.`,
            "success"
        );


        if (result) {

            const score =
                result.risk_score ??
                result.security_score ??
                null;


            const level =
                result.risk_level ??
                result.level ??
                null;


            if (score !== null) {

                writeConsole(
                    `[DETECTION] Risk Score: ${score}/100`
                );

            }


            if (level) {

                writeConsole(
                    `[DETECTION] Threat Level: ${String(level).toUpperCase()}`
                );

            }

        }


        showToast(
            `${label} simulated`,
            "LoginShield processed the synthetic authentication event.",
            "success"
        );


        /*
            Immediately refresh the dashboard.
        */

        await loadDashboard();


        /*
            If the simulation page is active,
            also refresh alerts/events.
        */

        await loadAlerts();


    } catch (error) {

        console.error(
            "Simulation error:",
            error
        );


        writeConsole(
            `[ERROR] ${error.message}`,
            "critical"
        );


        showToast(
            "Simulation failed",
            error.message,
            "error"
        );

    }

}


function writeConsole(message, type = "") {

    const consoleElement =
        $("simulationConsole");

    if (!consoleElement) {
        return;
    }


    const line =
        document.createElement("div");


    const time =
        new Date()
            .toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );


    line.innerHTML = `

        <span class="console-time">
            [${time}]
        </span>

        <span class="${
            type
                ? `console-${type}`
                : ""
        }">

            ${escapeHTML(message)}

        </span>

    `;


    consoleElement.appendChild(line);


    consoleElement.scrollTop =
        consoleElement.scrollHeight;

}


/* =========================================================
   DATA HELPERS
========================================================= */

function extractEvents(data) {
    if (Array.isArray(data)) { return data; }
    if (Array.isArray(data?.events)) { return data.events; }
    if (Array.isArray(data?.results)) { return data.results; }
    if (Array.isArray(data?.data)) { return data.data; }
    if (Array.isArray(data?.alerts)) { return data.alerts; } // <--- This is the missing link!
    return [];
}

function normalizeStatus(status) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value.includes("success") ||
        value === "verified" ||
        value === "authenticated"
    ) {

        return "success";

    }


    return "failed";

}


function normalizeRiskLevel(
    level,
    score
) {

    if (level) {

        const normalized =
            String(level)
                .toLowerCase();


        if (
            normalized.includes("critical")
        ) {
            return "critical";
        }

        if (
            normalized.includes("high")
        ) {
            return "high";
        }

        if (
            normalized.includes("medium")
        ) {
            return "medium";
        }

        if (
            normalized.includes("low")
        ) {
            return "low";
        }

    }


    const numericScore =
        Number(score || 0);


    if (numericScore >= 80) {
        return "critical";
    }

    if (numericScore >= 60) {
        return "high";
    }

    if (numericScore >= 30) {
        return "medium";
    }

    return "low";

}


function riskClass(level) {

    return `risk-${String(level)
        .toLowerCase()}`;

}


function parseReasons(value) {

    if (!value) {
        return [];
    }


    if (Array.isArray(value)) {
        return value;
    }


    if (typeof value === "object") {

        return Object.entries(value)
            .map(
                ([key, val]) =>
                    `${key}: ${val}`
            );

    }


    const stringValue =
        String(value);


    try {

        const parsed =
            JSON.parse(stringValue);

        if (Array.isArray(parsed)) {
            return parsed;
        }

    } catch {
        /*
            Not JSON.
        */
    }


    /*
        Detection reasons may be stored
        as a comma-separated string.
    */

    return stringValue
        .split(",")
        .map(reason => reason.trim())
        .filter(Boolean);

}


function formatLocation(event) {

    const parts = [

        event.city,

        event.region,

        event.country

    ]
    .filter(Boolean);


    if (parts.length) {

        return parts.join(", ");

    }


    return "Unknown location";

}


function formatTimestamp(timestamp) {

    if (!timestamp) {
        return "Unknown";
    }


    const date =
        new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return escapeHTML(
            timestamp
        );

    }


    return date.toLocaleString(
        [],
        {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function formatNumber(value) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-IN"
    );

}


function setText(
    id,
    value
) {

    const element =
        $(id);

    if (element) {

        element.textContent =
            value;

    }

}


function updateLastUpdated() {

    setText(
        "lastUpdated",
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        )
    );

}


/* =========================================================
   TOAST SYSTEM
========================================================= */

function showToast(
    title,
    message,
    type = "success"
) {

    const container =
        $("toastContainer");

    if (!container) {
        return;
    }


    const toast =
        document.createElement("div");


    toast.className =
        `toast ${type}`;


    toast.innerHTML = `

        <strong>
            ${escapeHTML(title)}
        </strong>

        <p>
            ${escapeHTML(message)}
        </p>

    `;


    container.appendChild(toast);


    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateY(8px)";

        toast.style.transition =
            "0.25s ease";


        setTimeout(() => {

            toast.remove();

        }, 250);

    }, 3500);

}


/* =========================================================
   MODAL
========================================================= */

function closeEventModal() {

    $("eventModal")
        ?.classList.add("hidden");

}



/* =========================================================
   AUTHENTICATION FLOW
========================================================= */

async function requestLoginOTP() {

    const phoneInput = $("authPhone");
    const emailInput = $("authEmail");
    const button = $("requestOtpButton");

    if (!phoneInput || !emailInput) {
        return;
    }

    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    /*
        Basic validation.
    */

    if (!phone) {

        showAuthMessage(
            "Please enter your phone number.",
            "error"
        );

        phoneInput.focus();

        return;
    }


    if (!/^[0-9]{10}$/.test(phone)) {

        showAuthMessage(
            "Please enter a valid 10-digit Indian mobile number.",
            "error"
        );

        phoneInput.focus();

        return;
    }


    if (!email) {

        showAuthMessage(
            "Please enter your email address.",
            "error"
        );

        emailInput.focus();

        return;
    }


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

        showAuthMessage(
            "Please enter a valid email address.",
            "error"
        );

        emailInput.focus();

        return;
    }


    /*
        Prevent duplicate requests.
    */

    if (button) {

        button.disabled = true;

        button.innerHTML = `
            <span>Sending OTP...</span>
            <span>•••</span>
        `;

    }


    try {

        const result =
            await apiFetch(
                "/auth/request-otp",
                {
                    method: "POST",

                    body: JSON.stringify({
                        phone: phone,
                        email: email
                    })
                }
            );


        /*
            Remember pending identity.
        */

        pendingAuth.phone =
            phone;

        pendingAuth.email =
            email;


        /*
            Update OTP destination.
        */

        setText(
            "otpDestination",
            `+91 ${phone}`
        );


        /*
            Demo environment.

            The backend currently returns demo_otp.
            We display it so the complete flow can
            be demonstrated without an SMS provider.
        */

        if (result?.demo_otp) {

            setText(
                "demoOtp",
                result.demo_otp
            );

            $("demoOtpBox")
                ?.classList.remove("hidden");

        }


        /*
            Move to OTP screen.
        */

        showAuthStep(2);


        showAuthMessage(
            "OTP generated successfully. Complete verification to continue.",
            "success"
        );


        /*
            Automatically focus first OTP box.
        */

        setTimeout(() => {

            document
                .querySelector(".otp-input")
                ?.focus();

        }, 100);


    } catch (error) {

        console.error(
            "OTP request failed:",
            error
        );

        showAuthMessage(
            error.message ||
            "Unable to generate OTP.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML = `
                <span>Continue Securely</span>
                <span>→</span>
            `;

        }

    }

}


/* =========================================================
   OTP VERIFICATION
========================================================= */

async function verifyLoginOTP() {

    const otpInputs =
        document.querySelectorAll(
            ".otp-input"
        );


    const otp =
        Array.from(otpInputs)
            .map(input =>
                input.value.trim()
            )
            .join("");


    if (otp.length !== 6) {

        showAuthMessage(
            "Please enter the complete 6-digit OTP.",
            "error"
        );

        return;
    }


    if (!pendingAuth.phone) {

        showAuthMessage(
            "Your authentication session has expired. Please request a new OTP.",
            "error"
        );

        showAuthStep(1);

        return;
    }


    const verifyButton =
        document.querySelector(
            "#authStepTwo .auth-primary-button"
        );


    if (verifyButton) {

        verifyButton.disabled = true;

        verifyButton.innerHTML = `
            <span>Verifying...</span>
            <span>•••</span>
        `;

    }


    try {

        const result =
            await apiFetch(
                "/auth/verify-otp",
                {
                    method: "POST",

                    body: JSON.stringify({

                        phone:
                            pendingAuth.phone,

                        otp:
                            otp

                    })
                }
            );


        /*
            Authentication successful.
        */

        currentUser.phone =
            pendingAuth.phone;

        currentUser.email =
            pendingAuth.email;

        authCompleted = true;


        /*
            Show success state.
        */

        showAuthMessage(
            "Authentication successful. Your security session is active.",
            "success"
        );


        /*
            Give the user a moment to see
            the successful authentication state.
        */

        setTimeout(() => {

            enterApplication();

        }, 700);


    } catch (error) {

        console.error(
            "OTP verification failed:",
            error
        );


        /*
            Clear OTP inputs after failure.
        */

        otpInputs.forEach(input => {

            input.value = "";

        });


        otpInputs[0]?.focus();


        showAuthMessage(
            error.message ||
            "OTP verification failed.",
            "error"
        );


    } finally {

        if (verifyButton) {

            verifyButton.disabled = false;

            verifyButton.innerHTML = `
                <span>Verify & Sign In</span>
                <span>→</span>
            `;

        }

    }

}


/* =========================================================
   AUTH STEP CONTROL
========================================================= */

function showAuthStep(step) {

    const stepOne =
        $("authStepOne");

    const stepTwo =
        $("authStepTwo");


    if (!stepOne || !stepTwo) {
        return;
    }


    if (step === 1) {

        stepOne.classList.remove("hidden");

        stepTwo.classList.add("hidden");

        clearAuthMessage();

    }

    else if (step === 2) {

        stepOne.classList.add("hidden");

        stepTwo.classList.remove("hidden");

        clearAuthMessage();

    }

}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function showAuthMessage(
    message,
    type = "info"
) {

    const element =
        $("authMessage");

    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `auth-message ${type}`;

}


function clearAuthMessage() {

    const element =
        $("authMessage");

    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.className =
        "auth-message hidden";

}


/* =========================================================
   ENTER APPLICATION
========================================================= */

function enterApplication() {

    const authScreen =
        $("authScreen");


    if (!authScreen) {
        return;
    }


    /*
        Update profile identity.
    */

    if (currentUser.phone) {

        setText(
            "profilePhone",
            `+91 ${currentUser.phone}`
        );

    }


    /*
        Hide authentication screen.
    */

    authScreen.style.opacity =
        "0";

    authScreen.style.transition =
        "opacity 0.35s ease";


    setTimeout(() => {

        authScreen.style.display =
            "none";


        /*
            Start application on dashboard.
        */

        navigateTo("dashboard");


        /*
            Refresh everything immediately.
        */

        loadDashboard();

        loadAlerts();

    }, 350);

}


/* =========================================================
   OTP INPUT EXPERIENCE
========================================================= */

function initializeOtpInputs() {

    const inputs =
        document.querySelectorAll(
            ".otp-input"
        );


    inputs.forEach((input, index) => {

        input.addEventListener(
            "input",
            event => {

                /*
                    Keep only one numeric character.
                */

                event.target.value =
                    event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 1);


                /*
                    Move forward automatically.
                */

                if (
                    event.target.value &&
                    index < inputs.length - 1
                ) {

                    inputs[index + 1].focus();

                }

            }
        );


        input.addEventListener(
            "keydown",
            event => {

                /*
                    Backspace moves backward.
                */

                if (
                    event.key === "Backspace" &&
                    !input.value &&
                    index > 0
                ) {

                    inputs[index - 1].focus();

                }


                /*
                    Allow left/right navigation.
                */

                if (
                    event.key === "ArrowLeft" &&
                    index > 0
                ) {

                    inputs[index - 1].focus();

                }

                if (
                    event.key === "ArrowRight" &&
                    index < inputs.length - 1
                ) {

                    inputs[index + 1].focus();

                }

            }
        );


        /*
            Allow pasting the entire OTP.
        */

        input.addEventListener(
            "paste",
            event => {

                event.preventDefault();

                const pasted =
                    event.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);


                pasted
                    .split("")
                    .forEach(
                        (character, pastedIndex) => {

                            if (
                                inputs[pastedIndex]
                            ) {

                                inputs[
                                    pastedIndex
                                ].value =
                                    character;

                            }

                        }
                    );


                const focusIndex =
                    Math.min(
                        pasted.length,
                        inputs.length - 1
                    );


                inputs[
                    focusIndex
                ]?.focus();

            }
        );

    });

}


/* =========================================================
   AUTH FORM KEYBOARD SHORTCUTS
========================================================= */

function initializeAuthInputs() {

    const phone =
        $("authPhone");

    const email =
        $("authEmail");


    phone?.addEventListener(
        "input",
        event => {

            event.target.value =
                event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);

        }
    );


    email?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                requestLoginOTP();

            }

        }
    );

}


/* =========================================================
   AUTH INITIALIZATION
========================================================= */

function initializeAuthentication() {

    initializeOtpInputs();

    initializeAuthInputs();

}


/*
    Initialize authentication once the DOM exists.
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAuthentication();

    }
);




/* =========================================================
   GLOBAL EXPORTS
========================================================= */

/*
    These functions are referenced directly
    by onclick attributes in index.html.
*/

window.navigateTo =
    navigateTo;

window.loadEvents =
    loadEvents;

window.loadAlerts =
    loadAlerts;

window.loadLocations =
    loadLocations;

window.openInvestigation =
    openInvestigation;

window.runSimulation =
    runSimulation;

window.closeEventModal =
    closeEventModal;



// added at last

window.requestLoginOTP =
    requestLoginOTP;

window.verifyLoginOTP =
    verifyLoginOTP;

window.showAuthStep =
    showAuthStep;