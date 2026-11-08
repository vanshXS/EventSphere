package com.vansh.eventsphere.eventsphere.college.dto;

import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CollegeApplicationRequest {

    @NotBlank
    @Size(max = 160)
    private String name;

    @NotBlank
    @Size(min = 2, max = 20)
    private String code;

    @Size(max = 255)
    private String officialWebsite;

    @Size(max = 500)
    private String address;

    private CollegeVerificationMode verificationMode;

    private String proposedDomain;

    @Email
    private String domainContactEmail;

    @Email
    private String initialAdminEmail;
}