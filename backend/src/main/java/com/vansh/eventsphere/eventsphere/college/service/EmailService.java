package com.vansh.eventsphere.eventsphere.college.service;

import java.io.UnsupportedEncodingException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:noreply@eventsphere.com}}")
    private String fromAddress;

    @Value("${app.mail.from-name:EventSphere}")
    private String fromName;

    public void sendCollegeDomainOTP(String to, String domain, String otp) {
        String subject = "EventSphere - College Domain Verification OTP";
        String html = buildCollegeDomainOTPEmail(domain, otp);
        sendHtml(to, subject, html);
    }

    public void sendStudentAffiliationOTP(String to, String collegeName, String otp) {
        String subject = "EventSphere - College Affiliation Verification OTP";
        String html = buildStudentAffiliationOTPEmail(collegeName, otp);
        sendHtml(to, subject, html);
    }

    public void sendCollegeAdminInvitation(String to, String collegeName, String invitationLink) {
        String subject = "EventSphere - College Admin Invitation";
        String html = buildCollegeAdminInvitationEmail(collegeName, invitationLink);
        sendHtml(to, subject, html);
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String from = (fromAddress != null && !fromAddress.isBlank()) ? fromAddress : "noreply@eventsphere.com";
            String senderName = (fromName != null && !fromName.isBlank()) ? fromName : "EventSphere";

            helper.setFrom(from, senderName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Email successfully sent to {} with subject: '{}'", to, subject);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            log.error("Failed to send email to '{}' with subject '{}': {}", to, subject, e.getMessage(), e);
            throw new IllegalStateException("Could not send email: " + e.getMessage(), e);
        }
    }

    private String buildCollegeDomainOTPEmail(String domain, String otp) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>EventSphere - College Domain Verification</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">EventSphere</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">College Domain Verification</p>
                    </div>
                    <div style="background: #fafafa; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 16px; margin-top: 0;">A request was made to verify the official domain <strong style="color: #4f46e5;">%s</strong> for your institution.</p>
                        <p>Your one-time verification code is:</p>
                        <div style="background: white; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; font-family: monospace;">%s</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                        <p style="color: #666; font-size: 14px;">If you did not request this verification, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">EventSphere - Event Management Platform</p>
                    </div>
                </body>
                </html>
                """.formatted(domain, otp);
    }

    private String buildStudentAffiliationOTPEmail(String collegeName, String otp) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>EventSphere - College Affiliation Verification</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">EventSphere</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">College Affiliation Verification</p>
                    </div>
                    <div style="background: #fafafa; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 16px; margin-top: 0;">You are verifying your student affiliation with <strong style="color: #4f46e5;">%s</strong>.</p>
                        <p>Your one-time verification code is:</p>
                        <div style="background: white; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; font-family: monospace;">%s</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                        <p style="color: #666; font-size: 14px;">If you did not request this verification, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">EventSphere - Event Management Platform</p>
                    </div>
                </body>
                </html>
                """.formatted(collegeName, otp);
    }

    private String buildCollegeAdminInvitationEmail(String collegeName, String invitationLink) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>EventSphere - College Admin Invitation</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">EventSphere</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">College Admin Invitation</p>
                    </div>
                    <div style="background: #fafafa; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 16px; margin-top: 0;">You have been invited to become a College Administrator for <strong style="color: #4f46e5;">%s</strong> on EventSphere.</p>
                        <p>As a College Admin, you will be able to review and approve student affiliation requests for your institution.</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="%s" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">This invitation link is valid for 7 days. If you did not expect this invitation, please contact your institution's EventSphere administrator.</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">EventSphere - Event Management Platform</p>
                    </div>
                </body>
                </html>
                """.formatted(collegeName, invitationLink);
    }
}