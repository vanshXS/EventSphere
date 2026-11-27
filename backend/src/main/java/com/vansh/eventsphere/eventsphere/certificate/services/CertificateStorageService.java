package com.vansh.eventsphere.eventsphere.certificate.services;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CertificateStorageService {

    private static final int MAX_PDF_BYTES = 10 * 1024 * 1024;

    private final Path storageDirectory;

    public CertificateStorageService(
            @Value("${certificate.storage.directory}") String directory
    ) throws IOException {
        this.storageDirectory = Path.of(directory)
                .toAbsolutePath()
                .normalize();

        Files.createDirectories(this.storageDirectory);
    }

    public StoredCertificate store(String certificateId, byte[] pdf)
            throws IOException {
        Path file = resolveFile(certificateId);

        if (pdf == null || pdf.length == 0 || pdf.length > MAX_PDF_BYTES) {
            throw new IllegalArgumentException("Invalid PDF size");
        }

        String hash = sha256(pdf);

        // CREATE_NEW refuses to overwrite an existing file.
        FileChannel channel = FileChannel.open(
                file,
                StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE
        );

        try (channel) {
            ByteBuffer buffer = ByteBuffer.wrap(pdf);

            while (buffer.hasRemaining()) {
                channel.write(buffer);
            }

            channel.force(true);
        } catch (IOException | RuntimeException failure) {
            try {
                Files.deleteIfExists(file);
            } catch (IOException cleanupFailure) {
                failure.addSuppressed(cleanupFailure);
            }
            throw failure;
        }

        return new StoredCertificate(certificateId, hash);
    }

    public byte[] readVerified(String storageKey, String expectedSha256)
            throws IOException {
        Path file = resolveFile(storageKey);

        if (expectedSha256 == null || expectedSha256.isBlank()) {
            throw new IllegalArgumentException("Certificate hash is required");
        }

        if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                || Files.size(file) > MAX_PDF_BYTES) {
            throw new IOException("Certificate file is unavailable");
        }

        byte[] pdf = Files.readAllBytes(file);

        if (pdf.length == 0 || pdf.length > MAX_PDF_BYTES
                || !sha256(pdf).equals(expectedSha256)) {
            throw new IOException("Certificate file failed integrity verification");
        }

        return pdf;
    }

    private Path resolveFile(String certificateId) {
        if (certificateId == null) {
            throw new IllegalArgumentException("Certificate ID is required");
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(certificateId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid certificate ID", exception);
        }

        if (!uuid.toString().equalsIgnoreCase(certificateId)) {
            throw new IllegalArgumentException("Invalid certificate ID");
        }

        return storageDirectory.resolve(uuid + ".pdf");
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record StoredCertificate(String storageKey, String sha256) {
    }
}