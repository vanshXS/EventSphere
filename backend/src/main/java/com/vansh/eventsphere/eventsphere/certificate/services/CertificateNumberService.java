package com.vansh.eventsphere.eventsphere.certificate.services;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

@Service
public class CertificateNumberService {

    public String generate() {

        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .toUpperCase(Locale.ROOT);

        return "ES-" + randomPart;
    }
}
