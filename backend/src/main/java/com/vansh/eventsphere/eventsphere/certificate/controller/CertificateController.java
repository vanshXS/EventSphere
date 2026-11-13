package com.vansh.eventsphere.eventsphere.certificate.controller;

import com.vansh.eventsphere.eventsphere.certificate.dto.CertificateApi.*;
import com.vansh.eventsphere.eventsphere.certificate.models.*;
import com.vansh.eventsphere.eventsphere.certificate.repository.CertificateRepository;
import com.vansh.eventsphere.eventsphere.certificate.services.CertificateStorageService;
import com.vansh.eventsphere.eventsphere.certificate.services.CertificateWorkflowService;
import com.vansh.eventsphere.eventsphere.exception.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.Locale;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class CertificateController {
    private final CertificateWorkflowService workflow;
    private final CertificateRepository certificates;
    private final CertificateStorageService storage;
    @GetMapping("/organizer/events/{id}/certificates/eligibility")
    public Preview eventPreview(@PathVariable String id, Authentication auth) { return workflow.previewEvent(id, auth.getName()); }
    @PostMapping("/organizer/events/{id}/certificates/generate")
    public CertificateView eventGenerate(@PathVariable String id, @Valid @RequestBody GenerateRequest request, Authentication auth) { return workflow.generateEvent(id, auth.getName(), request); }
    @GetMapping("/organizer/activities/{id}/certificates/eligibility")
    public Preview activityPreview(@PathVariable String id, @RequestParam CertificateType type, @RequestParam(required=false) String roundId, Authentication auth) { return workflow.previewActivity(id, auth.getName(), type, roundId); }
    @PostMapping("/organizer/activities/{id}/certificates/generate")
    public CertificateView activityGenerate(@PathVariable String id, @Valid @RequestBody GenerateRequest request, Authentication auth) { return workflow.generateActivity(id, auth.getName(), request); }
    @GetMapping("/participant/certificates")
    public Page<CertificateView> mine(@RequestParam(defaultValue="0") int page, Authentication auth) {
        if (page < 0 || page > 10000) throw new ApiException("Invalid page", HttpStatus.BAD_REQUEST);
        return certificates.findByRecipientUserIdAndStatusOrderByIssuedAtDescIdDesc(auth.getName(), CertificateStatus.ISSUED, PageRequest.of(page, 20)).map(CertificateView::of);
    }
    @GetMapping("/participant/certificates/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable String id, Authentication auth) throws IOException {
        Certificate c = certificates.findByIdAndRecipientUserIdAndStatus(id, auth.getName(), CertificateStatus.ISSUED).orElseThrow(() -> new ApiException("Certificate not found", HttpStatus.NOT_FOUND));
        byte[] pdf = storage.readVerified(c.getPdfStorageKey(), c.getPdfSha256());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(c.getCertificateNumber() + ".pdf").build().toString()).body(pdf);
    }
    @GetMapping("/public/certificates/{number}/verify")
    public ResponseEntity<VerifyResponse> verify(@PathVariable String number) {
        if (!number.matches("(?i)ES-[a-f0-9]{32}")) return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new VerifyResponse("NOT_FOUND"));
        String status = certificates.findByCertificateNumber(number.toUpperCase(Locale.ROOT)).filter(c -> c.getStatus() == CertificateStatus.ISSUED || c.getStatus() == CertificateStatus.REVOKED).map(c -> c.getStatus().name()).orElse("NOT_FOUND");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new VerifyResponse(status));
    }
}
