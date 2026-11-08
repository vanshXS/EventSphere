package com.vansh.eventsphere.eventsphere.college.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StoredDocument {
    private String originalFilename;
    private String contentType;
    private long size;
    private String storagePath;
}