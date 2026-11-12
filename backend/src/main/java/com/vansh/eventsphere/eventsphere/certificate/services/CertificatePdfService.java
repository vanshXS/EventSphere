package com.vansh.eventsphere.eventsphere.certificate.services;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Locale;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateType;

@Service
public class CertificatePdfService {

    private final TemplateEngine templateEngine;

    public CertificatePdfService() {
        ClassLoaderTemplateResolver resolver =
                new ClassLoaderTemplateResolver();

        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.XML);
        resolver.setCharacterEncoding("UTF-8");

        this.templateEngine = new TemplateEngine();
        this.templateEngine.setTemplateResolver(resolver);
    }

    public byte[] generate(CertificatePdfData data) throws IOException {
        validate(data);

        // 1. Put the certificate values into Thymeleaf's context.
        Context context = new Context(Locale.ROOT);
        context.setVariable("recipientName", data.recipientName());
        context.setVariable("scopeName", data.scopeName());
        context.setVariable(
                "isWinner",
                data.type() == CertificateType.WINNER
        );
        context.setVariable("rank", data.rank());
        context.setVariable("teamName", data.teamName());
        context.setVariable("issueDate", data.issueDate().toString());
        context.setVariable("certificateNumber", data.certificateNumber());

        // 2. Fill templates/certificate.html with those values.
        String html = templateEngine.process("certificate", context);

        // 3. Convert the filled HTML into PDF bytes.
        byte[] pdf;

        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder renderer = new PdfRendererBuilder();

            renderer.withHtmlContent(html, null);

            // This template has no external images, fonts, or stylesheets.
            renderer.useUriResolver((baseUri, uri) -> null);
            renderer.useExternalResourceAccessControl(
                    (uri, resourceType) -> false,
                    null
            );

            renderer.toStream(output);
            renderer.run();

            pdf = output.toByteArray();
        }

        // Avoid issuing a certificate that accidentally spans multiple pages.
        try (PDDocument document = Loader.loadPDF(pdf)) {
            if (document.getNumberOfPages() != 1) {
                throw new IllegalStateException(
                        "Certificate must fit on one page"
                );
            }
        }

        return pdf;
    }

    private void validate(CertificatePdfData data) {
        if (data == null || data.type() == null || data.issueDate() == null) {
            throw new IllegalArgumentException(
                    "Certificate type and issue date are required"
            );
        }

        requireSupportedText(data.recipientName(), "Recipient name", 100);
        requireSupportedText(data.scopeName(), "Event or activity name", 120);
        requireSupportedText(data.certificateNumber(), "Certificate number", 64);

        if (data.teamName() != null && !data.teamName().isBlank()) {
            requireSupportedText(data.teamName(), "Team name", 100);
        }

        if (data.type() == CertificateType.WINNER
                && (data.rank() == null || data.rank() < 1 || data.rank() > 3)) {
            throw new IllegalArgumentException(
                    "Winner rank must be between 1 and 3"
            );
        }
    }

    private void requireSupportedText(
            String value,
            String field,
            int maxLength
    ) {
        if (value == null || value.isBlank() || value.length() > maxLength) {
            throw new IllegalArgumentException(field + " is invalid");
        }

        // Temporary limit while the template uses the built-in Helvetica font.
        boolean unsupported = value.chars()
                .anyMatch(character -> character < 32 || character > 126);

        if (unsupported) {
            throw new IllegalArgumentException(
                    field + " contains characters not supported by the current template"
            );
        }
    }

    public record CertificatePdfData(
            String recipientName,
            String scopeName,
            CertificateType type,
            Integer rank,
            String teamName,
            LocalDate issueDate,
            String certificateNumber
    ) {
    }
}