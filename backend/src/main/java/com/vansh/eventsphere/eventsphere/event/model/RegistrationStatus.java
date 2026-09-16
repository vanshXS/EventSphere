package com.vansh.eventsphere.eventsphere.event.model;

public enum RegistrationStatus {
    REGISTERED, //your existing registrations; we'll treat these as approved
    CANCELLED,
    PENDING,
    REJECTED,
    APPROVED
}
