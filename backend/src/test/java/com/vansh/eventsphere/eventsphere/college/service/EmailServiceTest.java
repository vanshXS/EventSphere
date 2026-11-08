package com.vansh.eventsphere.eventsphere.college.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromAddress", "test@eventsphere.com");
        ReflectionTestUtils.setField(emailService, "fromName", "EventSphere Support");
    }

    @Test
    void sendCollegeDomainOTP_success() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendCollegeDomainOTP("admin@college.edu", "college.edu", "123456")
        );

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendStudentAffiliationOTP_success() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendStudentAffiliationOTP("student@college.edu", "Stanford University", "654321")
        );

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendCollegeAdminInvitation_success() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendCollegeAdminInvitation("dean@college.edu", "MIT", "https://eventsphere.com/invite/123")
        );

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendEmail_throwsIllegalStateException_whenMailSenderFails() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP server offline")).when(mailSender).send(any(MimeMessage.class));

        assertThrows(IllegalStateException.class, () ->
                emailService.sendCollegeDomainOTP("admin@college.edu", "college.edu", "123456")
        );
    }
}

