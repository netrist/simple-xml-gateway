<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        >
    <xsl:output indent="yes" />

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" />
        </xsl:copy>
    </xsl:template>

    <xsl:template match="soapenv:*">
        <xsl:apply-templates select="@* | node()" />
    </xsl:template>
</xsl:stylesheet>