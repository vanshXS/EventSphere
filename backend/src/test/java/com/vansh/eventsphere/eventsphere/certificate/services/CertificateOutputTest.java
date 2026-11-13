package com.vansh.eventsphere.eventsphere.certificate.services;

import com.vansh.eventsphere.eventsphere.certificate.models.CertificateType;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class CertificateOutputTest {
    @Test void pdfEscapesNamesAndContainsVerificationInformation() throws Exception {
        var service = new CertificatePdfService();
        var data = new CertificatePdfService.CertificatePdfData("Alice & Bob", "Science Fair", CertificateType.WINNER, 1, "Team A", LocalDate.of(2026, 11, 12), "ES-ABC123");
        byte[] pdf = service.generate(data);
        try (var document = Loader.loadPDF(pdf)) {
            assertEquals(1, document.getNumberOfPages());
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains("Alice & Bob"), text);
            assertTrue(text.contains("Science Fair"), text);
            assertTrue(text.contains("ES-ABC123"), text);
            assertTrue(text.contains("verify-certificate"), text);
        }
    }
    @Test void pdfRejectsUnsupportedCharacters() {
        var service = new CertificatePdfService();
        var data = new CertificatePdfService.CertificatePdfData("José", "Science Fair", CertificateType.PARTICIPATION, null, null, LocalDate.now(), "ES-ABC123");
        assertThrows(IllegalArgumentException.class, () -> service.generate(data));
    }
    @Test void storageDetectsTamperingAndRejectsTraversal(@TempDir Path directory) throws Exception {
        var service = new CertificateStorageService(directory.toString());
        String id = UUID.randomUUID().toString();
        var stored = service.store(id, new byte[]{1,2,3});
        assertArrayEquals(new byte[]{1,2,3}, service.readVerified(stored.storageKey(), stored.sha256()));
        Files.write(directory.resolve(id + ".pdf"), new byte[]{3,2,1});
        assertThrows(java.io.IOException.class, () -> service.readVerified(stored.storageKey(), stored.sha256()));
        assertThrows(IllegalArgumentException.class, () -> service.store("../bad", new byte[]{1}));
    }
}
