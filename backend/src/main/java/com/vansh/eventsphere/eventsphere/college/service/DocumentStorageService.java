package com.vansh.eventsphere.eventsphere.college.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.multipart.MultipartFile;

import com.vansh.eventsphere.eventsphere.college.model.StoredDocument;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class DocumentStorageService {

    private final Path storageRoot;

    public DocumentStorageService() {
        String configured = System.getenv("DOCUMENT_STORAGE_DIR");
        if (configured == null || configured.trim().isEmpty()) {
            configured = System.getProperty("java.io.tmpdir") + "/eventsphere-documents";
        }
        this.storageRoot = Paths.get(configured).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(storageRoot);
            log.info("Document storage initialized at: {}", storageRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create document storage directory: " + storageRoot, e);
        }
    }

    public StoredDocument store(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();
        long size = file.getSize();

        validateFile(file);

        String storedName = UUID.randomUUID().toString() + extension(originalName);
        Path target = storageRoot.resolve(storedName).normalize();

        if (!target.startsWith(storageRoot)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store document: {}", originalName, e);
            throw new IllegalStateException("Could not store document", e);
        }

        StoredDocument doc = StoredDocument.builder()
                .originalFilename(originalName)
                .contentType(contentType)
                .size(size)
                .storagePath(storedName)
                .build();

        log.debug("Stored document {} as {}", originalName, storedName);
        return doc;
    }

    public Resource load(String storedName) {
        Path target = storageRoot.resolve(storedName).normalize();
        if (!target.startsWith(storageRoot) || !Files.exists(target)) {
            throw new IllegalArgumentException("Document not found");
        }
        try {
            return new UrlResource(target.toUri());
        } catch (Exception e) {
            throw new IllegalStateException("Could not load document", e);
        }
    }

    private void validateFile(MultipartFile file) {
        String originalName = file.getOriginalFilename();

        if (originalName == null || originalName.trim().isEmpty()) {
            throw new IllegalArgumentException("File name is required");
        }

        long size = file.getSize();

        if (size <= 0) {
            throw new IllegalArgumentException("File is empty");
        }

        if (size > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
        }

        String ext = extension(originalName).toLowerCase();

        if (!ext.equals(".pdf")
                && !ext.equals(".jpg")
                && !ext.equals(".jpeg")
                && !ext.equals(".png")) {
            throw new IllegalArgumentException(
                    "Unsupported file type. Allowed: PDF, JPG, PNG"
            );
        }

        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = inputStream.readNBytes(8);

            if (!hasValidSignature(ext, header)) {
                throw new IllegalArgumentException(
                        "File content does not match the declared file type"
                );
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not validate uploaded file", e);
        }
    }

    private boolean hasValidSignature(String extension, byte[] header) {

        if (extension.equals(".pdf")) {
            byte[] pdfSignature = {
                    0x25, 0x50, 0x44, 0x46, 0x2D
            };

            return startsWith(header, pdfSignature);
        }

        if (extension.equals(".jpg") || extension.equals(".jpeg")) {
            byte[] jpegSignature = {
                    (byte) 0xFF, (byte) 0xD8, (byte) 0xFF
            };

            return startsWith(header, jpegSignature);
        }

        if (extension.equals(".png")) {
            byte[] pngSignature = {
                    (byte) 0x89, 0x50, 0x4E, 0x47,
                    0x0D, 0x0A, 0x1A, 0x0A
            };

            return startsWith(header, pngSignature);
        }

        return false;
    }

    private boolean startsWith(byte[] actual, byte[] expected) {
        return actual.length >= expected.length
                && Arrays.equals(
                Arrays.copyOf(actual, expected.length),
                expected
        );
    }

    private String extension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx < 0) return "";
        return filename.substring(idx);
    }
}